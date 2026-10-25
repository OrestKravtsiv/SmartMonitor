package com.smartmonitor.backend.model;

import com.google.cloud.Timestamp;

public class AlertEntity {
    private String deviceId;
    private String deviceName;
    private String direction;
    private Timestamp triggeredAt;
    private double actualValue;
    private double thresholdValue;
    private String status;
    private String acknowledgedBy;
    private Timestamp acknowledgedAt;

    public AlertEntity() {}

    public AlertEntity(
            String deviceId,
            String deviceName,
            String direction,
            Timestamp triggeredAt,
            double actualValue,
            double thresholdValue,
            String status,
            String acknowledgedBy,
            Timestamp acknowledgedAt) {
        this.deviceId = deviceId;
        this.deviceName = deviceName;
        this.direction = direction;
        this.triggeredAt = triggeredAt;
        this.actualValue = actualValue;
        this.thresholdValue = thresholdValue;
        this.status = status;
        this.acknowledgedBy = acknowledgedBy;
        this.acknowledgedAt = acknowledgedAt;
    }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }
    public String getDeviceName() { return deviceName; }
    public void setDeviceName(String deviceName) { this.deviceName = deviceName; }
    public String getDirection() { return direction; }
    public void setDirection(String direction) { this.direction = direction; }
    public Timestamp getTriggeredAt() { return triggeredAt; }
    public void setTriggeredAt(Timestamp triggeredAt) { this.triggeredAt = triggeredAt; }
    public double getActualValue() { return actualValue; }
    public void setActualValue(double actualValue) { this.actualValue = actualValue; }
    public double getThresholdValue() { return thresholdValue; }
    public void setThresholdValue(double thresholdValue) { this.thresholdValue = thresholdValue; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAcknowledgedBy() { return acknowledgedBy; }
    public void setAcknowledgedBy(String acknowledgedBy) { this.acknowledgedBy = acknowledgedBy; }
    public Timestamp getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(Timestamp acknowledgedAt) { this.acknowledgedAt = acknowledgedAt; }
}
