mod protocol;

use std::{env, net::SocketAddr, path::PathBuf};

use axum::{
    Router,
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    response::Response,
    routing::get,
};
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};
use tracing_subscriber::{EnvFilter, fmt};

use crate::protocol::{ClientMessage, ServerMessage};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let port: u16 = env::var("PORT").ok().and_then(|port| port.parse().ok()).unwrap_or(8080);
    let static_dir = PathBuf::from(env::var("STATIC_DIR").unwrap_or_else(|_| "../web/dist".into()));

    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address).await?;
    tracing::info!(%address, static_dir = %static_dir.display(), "bamdoodle-server listening");
    axum::serve(listener, app(static_dir)).await?;
    Ok(())
}

fn app(static_dir: PathBuf) -> Router {
    let spa = ServeDir::new(&static_dir).fallback(ServeFile::new(static_dir.join("index.html")));

    Router::new()
        .route("/api/health", get(|| async { "ok" }))
        .route("/ws", get(websocket))
        .fallback_service(spa)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
}

async fn websocket(upgrade: WebSocketUpgrade) -> Response {
    upgrade.on_upgrade(handle_socket)
}

async fn handle_socket(mut socket: WebSocket) {
    if send(
        &mut socket,
        &ServerMessage::Welcome {
            server_version: env!("CARGO_PKG_VERSION").into(),
        },
    )
    .await
    .is_err()
    {
        return;
    }

    while let Some(Ok(message)) = socket.recv().await {
        let Message::Text(text) = message else { continue };
        match serde_json::from_str::<ClientMessage>(&text) {
            Ok(ClientMessage::Ping) => tracing::debug!("ping"),
            Err(error) => tracing::debug!(%error, "ignoring malformed client message"),
        }
    }
}

async fn send(socket: &mut WebSocket, message: &ServerMessage) -> Result<(), axum::Error> {
    let json = serde_json::to_string(message).expect("server messages always serialize");
    socket.send(Message::Text(json.into())).await
}
