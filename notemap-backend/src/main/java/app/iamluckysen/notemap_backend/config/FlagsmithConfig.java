package app.iamluckysen.notemap_backend.config;

import com.flagsmith.FlagsmithClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FlagsmithConfig {

    @Bean
    public FlagsmithClient flagsmithClient(@Value("${flagsmith.api-key:}") String apiKey) {
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }
        return FlagsmithClient.newBuilder()
                .setApiKey(apiKey)
                .build();
    }
}
