package backend.exception;

import java.time.Instant;
import java.util.Map;

/** Standard JSON error body returned by every failing endpoint. */
public record ApiError(Instant timestamp, int status, String error, String message,
                       Map<String, String> fieldErrors) {
}
