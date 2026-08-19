import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    RECEPTIONIST = "RECEPTIONIST"
    NURSE = "NURSE"
    PHARMACIST = "PHARMACIST"
    PATIENT = "PATIENT"


class GenderType(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    CHECKED_IN = "CHECKED_IN"
    IN_CONSULTATION = "IN_CONSULTATION"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class CardStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    EXPIRED = "EXPIRED"
    LOST = "LOST"


class MembershipTier(str, enum.Enum):
    FREE = "FREE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    PLATINUM = "PLATINUM"


class InvoiceStatus(str, enum.Enum):
    UNPAID = "UNPAID"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    PAID = "PAID"
    REFUNDED = "REFUNDED"


class RelationshipType(str, enum.Enum):
    SPOUSE = "SPOUSE"
    CHILD = "CHILD"
    PARENT = "PARENT"
    OTHER = "OTHER"
