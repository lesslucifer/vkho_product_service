export enum ReceiptStatus {
    ENABLE = "ENABLE",
    DISABLE = "DISABLE",
    NEW = "NEW",
    RECEIVE = "RECEIVE",
    /** All receipt lines are TEMPORARY (temporary inbound done); no further action on request-receipt list. */
    COMPLETED = "COMPLETED",
}