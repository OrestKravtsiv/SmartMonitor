package com.smartmonitor.backend.config;

import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FirebaseAdminConfiguration {

    @Bean(destroyMethod = "delete")
    FirebaseApp firebaseApp(
            @Value("${firebase.project-id:${FIREBASE_PROJECT_ID:smartmonitor-2006}}") String projectId,
            @Value("${firebase.emulator-host:${FIREBASE_EMULATOR_HOST:}}") String emulatorHost,
            @Value("${firebase.credentials-path:${GOOGLE_APPLICATION_CREDENTIALS:}}") String credentialsPath)
            throws IOException {
        if (!emulatorHost.isBlank()) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(emulatorCredentials())
                    .setProjectId(projectId)
                    .build();
            return FirebaseApp.initializeApp(options, "smartmonitor-seeder-emulator");
        }

        if (credentialsPath.isBlank()) {
            throw new IllegalStateException(
                    "Set FIREBASE_EMULATOR_HOST for local development or "
                            + "GOOGLE_APPLICATION_CREDENTIALS for a cloud project.");
        }

        Path keyFile = Path.of(credentialsPath).toAbsolutePath().normalize();
        if (!Files.isRegularFile(keyFile)) {
            throw new IllegalStateException(
                    "GOOGLE_APPLICATION_CREDENTIALS does not point to a readable file: " + keyFile);
        }

        try (InputStream credentialsStream = Files.newInputStream(keyFile)) {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .setProjectId(projectId)
                    .build();
            return FirebaseApp.initializeApp(options, "smartmonitor-seeder");
        }
    }

    @Bean(destroyMethod = "close")
    Firestore firestore(
            FirebaseApp firebaseApp,
            @Value("${firebase.project-id:${FIREBASE_PROJECT_ID:smartmonitor-2006}}") String projectId,
            @Value("${firebase.emulator-host:${FIREBASE_EMULATOR_HOST:}}") String emulatorHost) {
        if (emulatorHost.isBlank()) {
            return FirestoreClient.getFirestore(firebaseApp);
        }

        String host = emulatorHost
                .replaceFirst("^https?://", "")
                .replaceFirst("/+$", "");
        return FirestoreOptions.newBuilder()
                .setProjectId(projectId)
                .setEmulatorHost(host)
                .setCredentials(emulatorCredentials())
                .build()
                .getService();
    }

    private static GoogleCredentials emulatorCredentials() {
        // Firestore Emulator recognizes the "owner" token as an Admin SDK client.
        return GoogleCredentials.create(
                new AccessToken("owner", Date.from(Instant.now().plus(Duration.ofHours(1)))));
    }
}
