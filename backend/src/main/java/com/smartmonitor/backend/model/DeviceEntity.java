package com.smartmonitor.backend.model;

import com.google.cloud.Timestamp;

public class DeviceEntity {
    private String name;
    private String sensorType;
    private String zoneId;
    private Double thresholdMin;
    private Double thresholdMax;
    private String status;
    private String secretHash;
    private Timestamp createdAt;
    private Timestamp statusChangedAt;

    public DeviceEntity() {}

    public DeviceEntity(
            String name,
            String sensorType,
            String zoneId,
            Double thresholdMin,
            Double thresholdMax,
            String status,
            String secretHash,
            Timestamp createdAt,
            Timestamp statusChangedAt) {
        this.name = name;
        this.sensorType = sensorType;
        this.zoneId = zoneId;
        this.thresholdMin = thresholdMin;
        this.thresholdMax = thresholdMax;
        this.status = status;
        this.secretHash = secretHash;
        this.createdAt = createdAt;
        this.statusChangedAt = statusChangedAt;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSensorType() { return sensorType; }
    public void setSensorType(String sensorType) { this.sensorType = sensorType; }
    public String getZoneId() { return zoneId; }
    public void setZoneId(String zoneId) { this.zoneId = zoneId; }
    public Double getThresholdMin() { return thresholdMin; }
    public void setThresholdMin(Double thresholdMin) { this.thresholdMin = thresholdMin; }
    public Double getThresholdMax() { return thresholdMax; }
    public void setThresholdMax(Double thresholdMax) { this.thresholdMax = thresholdMax; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getSecretHash() { return secretHash; }
    public void setSecretHash(String secretHash) { this.secretHash = secretHash; }
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
    public Timestamp getStatusChangedAt() { return statusChangedAt; }
    public void setStatusChangedAt(Timestamp statusChangedAt) { this.statusChangedAt = statusChangedAt; }
}
