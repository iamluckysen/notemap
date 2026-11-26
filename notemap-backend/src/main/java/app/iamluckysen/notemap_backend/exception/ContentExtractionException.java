package app.iamluckysen.notemap_backend.exception;

public class ContentExtractionException extends RuntimeException{
    public ContentExtractionException(String message) {
        super(message);
    }

    public ContentExtractionException(String message, Throwable cause) {
        super(message, cause);
    }
}
