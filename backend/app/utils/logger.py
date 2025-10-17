import logging
from logging.handlers import RotatingFileHandler
import sys


def get_logger(name: str = __name__) -> logging.Logger:
    """
    Returns a configured logger.

    Args:
        name: Name of the logger (usually __name__ of the module)

    Returns:
        logging.Logger
    """
    logger = logging.getLogger(name)

    if not logger.handlers:
        logger.setLevel(logging.INFO)  # Default level, can be DEBUG/ERROR etc.

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        console_handler.setFormatter(console_formatter)

        # File handler with rotation
        file_handler = RotatingFileHandler(
            "logs/app.log", maxBytes=5 * 1024 * 1024, backupCount=3
        )
        file_handler.setLevel(logging.INFO)
        file_formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        file_handler.setFormatter(file_formatter)

        # Add handlers to logger
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

        # Optional: prevent logging from propagating to the root logger
        logger.propagate = False

    return logger
