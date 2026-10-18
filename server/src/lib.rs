pub mod connection;
pub mod limits;
pub mod protocol;
pub mod registry;
pub mod room;
pub mod words;

use std::{path::Path, sync::Arc};

use axum::{Router, extract::State, extract::ws::WebSocketUpgrade, response::Response, routing::get};
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

use crate::registry::Registry;

/// The whole server: `/ws` for the game, `/api/health`, and the web app with an SPA fallback.
pub fn app(registry: Arc<Registry>, static_dir: &Path) -> Router {
    let spa = ServeDir::new(static_dir).fallback(ServeFile::new(static_dir.join("index.html")));

    Router::new()
        .route("/api/health", get(|| async { "ok" }))
        .route("/ws", get(websocket))
        .with_state(registry)
        .fallback_service(spa)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
}

async fn websocket(upgrade: WebSocketUpgrade, State(registry): State<Arc<Registry>>) -> Response {
    upgrade
        .max_message_size(limits::MAX_MESSAGE_BYTES)
        .on_upgrade(move |socket| connection::handle(socket, registry))
}
