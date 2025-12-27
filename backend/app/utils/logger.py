import logging

# ANSI escape codes for colors
RESET = "\033[0m"
LEVEL_COLOR = {
    "DEBUG": "\033[90m",  # Grey
    "INFO": "\033[34m",  # Blue
    "WARNING": "\033[93m",  # Yellow
    "ERROR": "\033[91m",  # Red
    "CRITICAL": "\033[95m",  # Magenta
}
MAX_LEVEL_LEN = max(len(level) for level in LEVEL_COLOR)


class ColoredFormatter(logging.Formatter):
    def format(self, record):
        levelname = record.levelname
        if levelname in LEVEL_COLOR:
            # Keep colon attached, pad spaces after colon
            spaces = " " * (
                MAX_LEVEL_LEN - len(levelname) + 1
            )  # +1 for at least one space
            record.levelname = f"{LEVEL_COLOR[levelname]}{levelname}{RESET}:{spaces}"
        return super().format(record)


# Set up logging
log_format = "%(levelname)s[%(asctime)s] %(message)s"
date_format = "%Y-%m-%d %H:%M:%S"

logging.basicConfig(
    level=logging.INFO,
    format=log_format,
    datefmt=date_format,
)

# Apply colored formatter to all handlers
for handler in logging.getLogger().handlers:
    handler.setFormatter(ColoredFormatter(log_format, datefmt=date_format))


def get_logger(name: str):
    return logging.getLogger(name)
