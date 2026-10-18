use std::{env, net::SocketAddr, path::PathBuf, sync::Arc};

use bamdoodle_server::{app, registry::Registry, words::WordLibrary};
use tracing_subscriber::{EnvFilter, fmt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let port: u16 = env::var("PORT").ok().and_then(|port| port.parse().ok()).unwrap_or(8080);
    let static_dir = PathBuf::from(env::var("STATIC_DIR").unwrap_or_else(|_| "../web/dist".into()));
    let words_dir = PathBuf::from(env::var("WORDS_DIR").unwrap_or_else(|_| "../words".into()));

    let words = Arc::new(WordLibrary::load(&words_dir)?);
    let registry = Registry::new(words);

    let address = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(address).await?;
    tracing::info!(%address, static_dir = %static_dir.display(), words_dir = %words_dir.display(), "bamdoodle-server listening");
    axum::serve(listener, app(registry, &static_dir)).await?;
    Ok(())
}
