import logging
import structlog

def configure_logger(log_level: str = "INFO") -> None:
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer() # Outputs uniform, machine-readable JSON
        ],
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, log_level.upper())),
        cache_logger_on_first_use=True,
    )

configure_logger()
logger = structlog.get_logger()
