//! The server's log: one JSON object per line in production, at most `LOG_LINES_PER_MINUTE` lines, and panics as
//! errors. The log is the only thing that costs more the more it's used (Cockpit bills storage), so the budget caps
//! that: whatever anyone sends, the server writes no more than this (decision 0005).

use std::{
    sync::Mutex,
    time::{Duration, Instant},
};

use tracing::{Event, Metadata, subscriber::Interest};
use tracing_subscriber::{
    EnvFilter, Layer,
    layer::{Context, Filter},
    prelude::*,
};

use crate::{connection::RateLimiter, limits};

/// Lets through at most `limit` log lines per `window` and drops the rest.
pub struct LogBudget(Mutex<RateLimiter>);

impl LogBudget {
    pub fn new(limit: u32, window: Duration) -> Self {
        Self(Mutex::new(RateLimiter::new(limit, window)))
    }
}

impl<S> Filter<S> for LogBudget {
    fn enabled(&self, _: &Metadata<'_>, _: &Context<'_, S>) -> bool {
        true
    }

    fn callsite_enabled(&self, _: &'static Metadata<'static>) -> Interest {
        // Every event is asked again: the answer depends on how many came before it.
        Interest::sometimes()
    }

    fn event_enabled(&self, _: &Event<'_>, _: &Context<'_, S>) -> bool {
        self.0
            .lock()
            .expect("never poisoned: nothing panics while holding it")
            .allow(Instant::now())
    }
}

/// Sets up the log: `RUST_LOG` (default `info`), JSON with `LOG_FORMAT=json`, the line budget, and panics as errors.
pub fn init(json: bool) {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into());
    let budget = || LogBudget::new(limits::LOG_LINES_PER_MINUTE, Duration::from_secs(60));
    let output = if json {
        tracing_subscriber::fmt::layer()
            .json()
            .flatten_event(true)
            .with_filter(budget())
            .boxed()
    } else {
        tracing_subscriber::fmt::layer().with_filter(budget()).boxed()
    };
    tracing_subscriber::registry().with(filter).with(output).init();

    // A panic (in a room's task, say) is logged as an error like any other, so the alert on server errors sees it.
    std::panic::set_hook(Box::new(|info| {
        let location = info.location().map(ToString::to_string).unwrap_or_default();
        let panic = info.payload_as_str().unwrap_or_default();
        tracing::error!(target: "bamdoodle::panic", %location, panic, "panic");
    }));
}

/// For tests: the events logged on this thread while the guard lives, as (target, fields), every value as text.
#[cfg(test)]
pub(crate) mod capture {
    use std::{
        collections::BTreeMap,
        fmt::Debug,
        sync::{Arc, Mutex},
    };

    use tracing::field::{Field, Visit};
    use tracing_subscriber::{Layer, layer::Context, prelude::*};

    pub(crate) type Events = Arc<Mutex<Vec<(String, BTreeMap<String, String>)>>>;

    struct Fields(BTreeMap<String, String>);

    impl Visit for Fields {
        fn record_debug(&mut self, field: &Field, value: &dyn Debug) {
            self.0.insert(field.name().into(), format!("{value:?}"));
        }
        fn record_str(&mut self, field: &Field, value: &str) {
            self.0.insert(field.name().into(), value.into());
        }
    }

    struct Capture(Events);

    impl<S: tracing::Subscriber> Layer<S> for Capture {
        fn on_event(&self, event: &tracing::Event<'_>, _: Context<'_, S>) {
            let mut fields = Fields(BTreeMap::new());
            event.record(&mut fields);
            let mut events = self.0.lock().expect("only the test thread logs");
            events.push((event.metadata().target().into(), fields.0));
        }
    }

    /// Captures until the guard drops; works across `.await` on a current-thread runtime.
    pub(crate) fn start() -> (tracing::subscriber::DefaultGuard, Events) {
        let events: Events = Arc::default();
        let guard = tracing::subscriber::set_default(tracing_subscriber::registry().with(Capture(events.clone())));
        (guard, events)
    }

    /// The events with this target and `event` field.
    pub(crate) fn of(events: &Events, target: &str, event: &str) -> Vec<BTreeMap<String, String>> {
        let events = events.lock().expect("only the test thread logs");
        events
            .iter()
            .filter(|(logged, fields)| logged == target && fields.get("event").is_some_and(|name| name == event))
            .map(|(_, fields)| fields.clone())
            .collect()
    }

    /// Like `start`, with a filter in front of the capture (to test the budget).
    pub(crate) fn start_filtered(
        filter: impl tracing_subscriber::layer::Filter<tracing_subscriber::Registry> + Send + Sync + 'static,
    ) -> (tracing::subscriber::DefaultGuard, Events) {
        let events: Events = Arc::default();
        let layer = Capture(events.clone()).with_filter(filter);
        let guard = tracing::subscriber::set_default(tracing_subscriber::registry().with(layer));
        (guard, events)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_budget_caps_the_lines_whatever_is_sent() {
        let (_guard, events) = capture::start_filtered(LogBudget::new(3, Duration::from_secs(60)));
        for line in 0..100 {
            tracing::info!(line, "spam");
        }
        assert_eq!(events.lock().unwrap().len(), 3);
    }
}
