package com.smartmonitor.backend.seed;

import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.AuthErrorCode;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.FirebaseApp;
import com.smartmonitor.backend.model.AlertEntity;
import com.smartmonitor.backend.model.AuditLogEntity;
import com.smartmonitor.backend.model.DeviceEntity;
import com.smartmonitor.backend.model.ReadingEntity;
import com.smartmonitor.backend.model.UserEntity;
import com.smartmonitor.backend.model.ZoneEntity;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "smartmonitor.seed.enabled", havingValue = "true")
public class FirestoreSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FirestoreSeeder.class);
    private static final int READING_COUNT = 12;
    private static final Duration READING_INTERVAL = Duration.ofMinutes(15);
    private static final Duration READING_RETENTION = Duration.ofDays(180);

    private final Firestore firestore;
    private final FirebaseApp firebaseApp;
    private final String authEmulatorHost;
    private final String authSeedPassword;

    public FirestoreSeeder(
            Firestore firestore,
            FirebaseApp firebaseApp,
            @Value("${firebase.auth-emulator-host:${FIREBASE_AUTH_EMULATOR_HOST:}}")
                    String authEmulatorHost,
            @Value("${smartmonitor.seed.auth-password:${SMARTMONITOR_SEED_AUTH_PASSWORD:}}")
                    String authSeedPassword) {
        this.firestore = firestore;
        this.firebaseApp = firebaseApp;
        this.authEmulatorHost = authEmulatorHost;
        this.authSeedPassword = authSeedPassword;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        seedZones();
        seedUsers();
        seedDevices();
        seedReadings();
        seedAlerts();
        seedAuditLogs();
        seedAuthEmulatorUsers();
        log.info("Firestore demo data is ready. Existing documents were left unchanged.");
    }

    private void seedZones() throws ExecutionException, InterruptedException {
        Timestamp createdAt = now();
        seedIfMissing("zones", "zone-1", new ZoneEntity("Склад №1", createdAt));
        seedIfMissing("zones", "zone-2", new ZoneEntity("Серверна", createdAt));
        seedIfMissing("zones", "zone-3", new ZoneEntity("Оранжерея", createdAt));
    }

    private void seedUsers() throws ExecutionException, InterruptedException {
        Timestamp createdAt = now();
        seedIfMissing("users", "seed-admin",
                new UserEntity("admin@smartmonitor.local", "ADMIN", List.of(), createdAt));
        seedIfMissing("users", "seed-operator",
                new UserEntity("operator@smartmonitor.local", "OPERATOR", List.of(), createdAt));
    }

    private void seedDevices() throws ExecutionException, InterruptedException {
        Timestamp createdAt = now();
        seedIfMissing("devices", "SM-1042", device(
                "Датчик температури 01", "Температура та вологість", "zone-1", 10, 35, "ONLINE", createdAt));
        seedIfMissing("devices", "SM-1043", device(
                "Датчик температури 02", "Температура та вологість", "zone-2", 10, 35, "ONLINE", createdAt));
        seedIfMissing("devices", "SM-1044", device(
                "Контроль вологості", "Датчик вологості ґрунту", "zone-3", 15, 80, "OFFLINE", createdAt));
        seedIfMissing("devices", "SM-1045", device(
                "Датчик мікроклімату", "Температура та вологість", "zone-1", 10, 35, "INACTIVE", createdAt));
    }

    private DeviceEntity device(
            String name,
            String sensorType,
            String zoneId,
            double thresholdMin,
            double thresholdMax,
            String status,
            Timestamp createdAt) {
        return new DeviceEntity(
                name,
                sensorType,
                zoneId,
                thresholdMin,
                thresholdMax,
                status,
                sha256("non-connectable-seed-placeholder:" + name),
                createdAt,
                createdAt);
    }

    private void seedReadings() throws ExecutionException, InterruptedException {
        seedReadings("SM-1042", 21.4, 1.0);
        seedReadings("SM-1043", 19.8, 0.8);
        seedReadings("SM-1044", 72.0, 2.0);
        seedReadings("SM-1045", 22.1, 0.6);
    }

    private void seedReadings(String deviceId, double average, double variation)
            throws ExecutionException, InterruptedException {
        Instant base = Instant.now().minus(READING_INTERVAL.multipliedBy(READING_COUNT));
        for (int index = 0; index < READING_COUNT; index++) {
            Instant timestamp = base.plus(READING_INTERVAL.multipliedBy(index));
            double value = average + Math.sin(index / 2.0) * variation;
            String readingId = "seed-" + index;
            ReadingEntity reading = new ReadingEntity(
                    Timestamp.ofTimeSecondsAndNanos(timestamp.getEpochSecond(), timestamp.getNano()),
                    round(value),
                    round(value - variation * 0.2),
                    round(value + variation * 0.2),
                    5,
                    Timestamp.ofTimeSecondsAndNanos(
                            timestamp.plus(READING_RETENTION).getEpochSecond(),
                            timestamp.plus(READING_RETENTION).getNano()));
            seedIfMissing("devices/" + deviceId + "/readings", readingId, reading);
        }
    }

    private void seedAlerts() throws ExecutionException, InterruptedException {
        Instant now = Instant.now();
        seedIfMissing("alerts", "seed-alert-offline", new AlertEntity(
                "SM-1044",
                "Контроль вологості",
                "below",
                timestamp(now.minus(Duration.ofMinutes(12))),
                72,
                80,
                "ACTIVE",
                null,
                null));
        seedIfMissing("alerts", "seed-alert-acknowledged", new AlertEntity(
                "SM-1042",
                "Датчик температури 01",
                "above",
                timestamp(now.minus(Duration.ofHours(2))),
                37.2,
                35,
                "ACKNOWLEDGED",
                "seed-admin",
                timestamp(now.minus(Duration.ofHours(1)))));
    }

    private void seedAuditLogs() throws ExecutionException, InterruptedException {
        Timestamp timestamp = now();
        seedIfMissing("auditLogs", "seed-log-zone-1", new AuditLogEntity(
                "seed-admin",
                "SEED_CREATED",
                "zone-1",
                timestamp,
                Map.of("entityType", "zone", "source", "initial-demo-data")));
        seedIfMissing("auditLogs", "seed-log-device-1", new AuditLogEntity(
                "seed-admin",
                "SEED_CREATED",
                "SM-1042",
                timestamp,
                Map.of("entityType", "device", "source", "initial-demo-data")));
    }

    private void seedAuthEmulatorUsers() throws FirebaseAuthException {
        if (authEmulatorHost.isBlank()) {
            log.info("Skipping Firebase Auth user creation: FIREBASE_AUTH_EMULATOR_HOST is not set.");
            return;
        }
        if (authSeedPassword.isBlank()) {
            log.info("Skipping Firebase Auth user creation: set SMARTMONITOR_SEED_AUTH_PASSWORD to opt in.");
            return;
        }

        FirebaseAuth auth = FirebaseAuth.getInstance(firebaseApp);
        createOrUpdateAuthUser(auth, "seed-admin", "admin@smartmonitor.local", "ADMIN");
        createOrUpdateAuthUser(auth, "seed-operator", "operator@smartmonitor.local", "OPERATOR");
    }

    private void createOrUpdateAuthUser(
            FirebaseAuth auth, String uid, String email, String role) throws FirebaseAuthException {
        try {
            auth.getUser(uid);
        } catch (FirebaseAuthException exception) {
            if (exception.getAuthErrorCode() != AuthErrorCode.USER_NOT_FOUND) {
                throw exception;
            }
            UserRecord.CreateRequest request = new UserRecord.CreateRequest()
                    .setUid(uid)
                    .setEmail(email)
                    .setPassword(authSeedPassword);
            auth.createUser(request);
        }
        auth.setCustomUserClaims(uid, Map.of("role", role));
    }

    private <T> void seedIfMissing(String collectionPath, String documentId, T entity)
            throws ExecutionException, InterruptedException {
        DocumentReference reference = firestore.document(collectionPath + "/" + documentId);
        boolean created = firestore.runTransaction(transaction -> {
            if (transaction.get(reference).get().exists()) {
                return false;
            }
            transaction.set(reference, entity);
            return true;
        }).get();
        log.debug("{} {}", created ? "Created" : "Kept existing", reference.getPath());
    }

    private static Timestamp now() {
        return Timestamp.now();
    }

    private static Timestamp timestamp(Instant instant) {
        return Timestamp.ofTimeSecondsAndNanos(instant.getEpochSecond(), instant.getNano());
    }

    private static double round(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available in this Java runtime.", exception);
        }
    }
}
