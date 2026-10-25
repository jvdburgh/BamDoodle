//! One WebSocket: the first message picks the room (create, join or watch), after that messages flow between the
//! socket and the room's task until either side goes away.

use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use axum::extract::ws::{Message, Utf8Bytes, WebSocket};
use tokio::sync::{mpsc, oneshot};

use crate::{
    limits,
    protocol::{ClientMessage, RejectReason, ServerMessage},
    registry::{Registry, RoomHandle},
    room::{
        HostClaim, clean_name,
        task::{ConnectionId, Entered, RoomCommand},
    },
};

pub async fn handle(mut socket: WebSocket, registry: Arc<Registry>) {
    let Some(hello) = first_message(&mut socket).await else {
        return;
    };
    let (room, connection, mut outbox) = match enter(hello, &registry).await {
        Ok(entered) => entered,
        Err(reason) => {
            let _ = send(&mut socket, &ServerMessage::Rejected { reason }).await;
            let _ = socket.send(Message::Close(None)).await;
            return;
        }
    };

    let mut limiter = RateLimiter::new(limits::MESSAGES_PER_SECOND, Duration::from_secs(1));
    loop {
        tokio::select! {
            outgoing = outbox.recv() => match outgoing {
                Some(message) => if send(&mut socket, &message).await.is_err() { break },
                None => break,
            },
            incoming = socket.recv() => match incoming {
                Some(Ok(Message::Text(text))) => {
                    if !limiter.allow(Instant::now()) {
                        tracing::debug!(connection, "dropping message: over the rate limit");
                        continue;
                    }
                    match serde_json::from_str::<ClientMessage>(&text) {
                        Ok(message) => {
                            if room.commands.send(RoomCommand::Message { connection, message }).await.is_err() {
                                break;
                            }
                        }
                        Err(error) => tracing::debug!(%error, "ignoring malformed client message"),
                    }
                }
                Some(Ok(Message::Close(_)) | Err(_)) | None => break,
                Some(Ok(_)) => {}
            },
        }
    }
    let _ = room.commands.send(RoomCommand::Leave { connection }).await;
}

async fn first_message(socket: &mut WebSocket) -> Option<ClientMessage> {
    let deadline = tokio::time::sleep(limits::HELLO_TIMEOUT);
    tokio::pin!(deadline);
    loop {
        tokio::select! {
            () = &mut deadline => return None,
            incoming = socket.recv() => match incoming {
                Some(Ok(Message::Text(text))) => return serde_json::from_str(&text).ok(),
                Some(Ok(Message::Ping(_) | Message::Pong(_))) => {}
                _ => return None,
            },
        }
    }
}

async fn enter(
    hello: ClientMessage,
    registry: &Arc<Registry>,
) -> Result<(RoomHandle, ConnectionId, mpsc::Receiver<ServerMessage>), RejectReason> {
    match hello {
        ClientMessage::CreateRoom { name, settings } => {
            clean_name(&name).ok_or(RejectReason::InvalidName)?;
            let (_, room) = registry.create()?;
            let (connection, outbox) = join(&room, name, None).await?;
            if let Some(settings) = settings {
                // The host's own first change, before anyone else knows the code.
                let message = ClientMessage::UpdateSettings { settings };
                let _ = room.commands.send(RoomCommand::Message { connection, message }).await;
            }
            Ok((room, connection, outbox))
        }
        ClientMessage::JoinRoom {
            code,
            name,
            session_token,
        } => {
            let room = registry.find(&code).ok_or(RejectReason::RoomNotFound)?;
            let (connection, outbox) = join(&room, name, session_token).await?;
            Ok((room, connection, outbox))
        }
        ClientMessage::HostRoom { name, settings } => {
            let name = clean_name(&name).ok_or(RejectReason::InvalidName)?;
            let (_, room) = registry.create()?;
            let (connection, outbox) = watch(&room, Some(HostClaim::New(name))).await?;
            if let Some(settings) = settings {
                let message = ClientMessage::UpdateSettings { settings };
                let _ = room.commands.send(RoomCommand::Message { connection, message }).await;
            }
            Ok((room, connection, outbox))
        }
        ClientMessage::WatchRoom { code, session_token } => {
            let room = registry.find(&code).ok_or(RejectReason::RoomNotFound)?;
            let (connection, outbox) = watch(&room, session_token.map(HostClaim::Resume)).await?;
            Ok((room, connection, outbox))
        }
        _ => Err(RejectReason::NotJoined),
    }
}

async fn watch(room: &RoomHandle, host: Option<HostClaim>) -> Result<Entered, RejectReason> {
    let (reply, answer) = oneshot::channel();
    room.commands
        .send(RoomCommand::Watch { host, reply })
        .await
        .map_err(|_| RejectReason::RoomNotFound)?;
    answer.await.map_err(|_| RejectReason::RoomNotFound)?
}

async fn join(room: &RoomHandle, name: String, session_token: Option<String>) -> Result<Entered, RejectReason> {
    let (reply, answer) = oneshot::channel();
    room.commands
        .send(RoomCommand::Join {
            name,
            session_token,
            reply,
        })
        .await
        .map_err(|_| RejectReason::RoomNotFound)?;
    answer.await.map_err(|_| RejectReason::RoomNotFound)?
}

async fn send(socket: &mut WebSocket, message: &ServerMessage) -> Result<(), axum::Error> {
    let json = serde_json::to_string(message).expect("server messages always serialize");
    socket.send(Message::Text(Utf8Bytes::from(json))).await
}

/// Allows `limit` messages in every `window` and drops the rest.
pub(crate) struct RateLimiter {
    limit: u32,
    window: Duration,
    window_start: Option<Instant>,
    count: u32,
}

impl RateLimiter {
    pub(crate) fn new(limit: u32, window: Duration) -> Self {
        Self {
            limit,
            window,
            window_start: None,
            count: 0,
        }
    }

    pub(crate) fn allow(&mut self, now: Instant) -> bool {
        match self.window_start {
            Some(start) if now.duration_since(start) < self.window => {}
            _ => {
                self.window_start = Some(now);
                self.count = 0;
            }
        }
        self.count += 1;
        self.count <= self.limit
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_rate_limiter_drops_bursts_and_recovers() {
        let mut limiter = RateLimiter::new(3, Duration::from_secs(1));
        let start = Instant::now();
        let allowed = (0..5).filter(|_| limiter.allow(start)).count();
        assert_eq!(allowed, 3);
        assert!(limiter.allow(start + Duration::from_secs(1)));
    }
}
