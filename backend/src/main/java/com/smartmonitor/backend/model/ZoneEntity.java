package com.smartmonitor.backend.model;

import com.google.cloud.Timestamp;

public class ZoneEntity {
    private String name;
    private Timestamp createdAt;

    public ZoneEntity() {}

    public ZoneEntity(String name, Timestamp createdAt) {
        this.name = name;
        this.createdAt = createdAt;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }
}
