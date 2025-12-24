# Architecture Documentation

This folder contains definitive architecture documentation for the EduThree platform.

---

## Documents

| Document | Description | Status |
|----------|-------------|--------|
| [Signal-Driven Discovery Architecture](./SIGNAL_DRIVEN_DISCOVERY_ARCHITECTURE.md) | Complete specification of the 4-signal company scoring system | ✅ Implemented |

---

## Purpose

These documents serve as the **single source of truth** for:
- System architecture decisions
- API integrations and data flows
- Database schema designs
- Algorithm specifications

---

## Document Standards

All architecture documents must include:
1. **Version and Date** - Track document evolution
2. **Status** - Draft / In Review / Implemented
3. **Compliance Reference** - Link to implementation plan
4. **Diagrams** - Visual representation of architecture
5. **Code Locations** - File paths for implementations
6. **Related Documents** - Cross-references

---

## Adding New Documents

When documenting new architecture:

1. Create a new `.md` file in this folder
2. Follow the naming convention: `FEATURE_NAME_ARCHITECTURE.md`
3. Include all standard sections
4. Update this README with the new document
5. Cross-reference from related docs

---

## Compliance

All implementations must comply with their corresponding architecture documents. Deviations require:
1. Documentation update with rationale
2. Version increment
3. Team review
