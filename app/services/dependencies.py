from app.config import settings

from app.services.store import InMemoryStateStore, RedisStateStore, StateStore

from app.logger import logger

_store_instance: StateStore = None


async def init_store() -> None:
    global _store_instance
    redis_url = settings.REDIS_URL
    env = settings.ENV.lower()

    if redis_url:
        logger.info(f"Connecting to Redis at {redis_url}...")
        _store_instance = RedisStateStore(redis_url)
        # Test connection
        try:
            await _store_instance.redis.ping()
            logger.info("Redis connection established.")
        except Exception as e:
            if env == "production":
                logger.error("Failed to connect to Redis in PRODUCTION. Failing fast.")
                raise e
            else:
                logger.warning(
                    f"Failed to connect to Redis in {env}. Falling back to InMemoryStore. Error: {e}"
                )
                _store_instance = InMemoryStateStore()
    else:
        if env == "production":
            raise RuntimeError("REDIS_URL is required in production environment.")
        logger.info("No REDIS_URL provided. Using InMemoryStateStore.")
        _store_instance = InMemoryStateStore()


def get_store() -> StateStore:
    if _store_instance is None:
        raise RuntimeError("Store not initialized. Call init_store() during startup.")
    return _store_instance
