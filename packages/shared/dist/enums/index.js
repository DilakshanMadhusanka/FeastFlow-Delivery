"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.AddressType = exports.CouponDiscountType = exports.OptionSelectionType = exports.DeliveryAssignmentStatus = exports.VehicleType = exports.PaymentStatus = exports.PaymentMethod = exports.OrderStatus = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["CUSTOMER"] = "CUSTOMER";
    UserRole["RESTAURANT_OWNER"] = "RESTAURANT_OWNER";
    UserRole["DELIVERY_DRIVER"] = "DELIVERY_DRIVER";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["RESTAURANT_ACCEPTED"] = "RESTAURANT_ACCEPTED";
    OrderStatus["PREPARING"] = "PREPARING";
    OrderStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    OrderStatus["DRIVER_ASSIGNED"] = "DRIVER_ASSIGNED";
    OrderStatus["PICKED_UP"] = "PICKED_UP";
    OrderStatus["ON_THE_WAY"] = "ON_THE_WAY";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["REJECTED"] = "REJECTED";
    OrderStatus["CANCELLED"] = "CANCELLED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["COD"] = "COD";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["ONLINE"] = "ONLINE";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "PENDING";
    PaymentStatus["COMPLETED"] = "COMPLETED";
    PaymentStatus["FAILED"] = "FAILED";
    PaymentStatus["REFUNDED"] = "REFUNDED";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var VehicleType;
(function (VehicleType) {
    VehicleType["BICYCLE"] = "BICYCLE";
    VehicleType["MOTORCYCLE"] = "MOTORCYCLE";
    VehicleType["SCOOTER"] = "SCOOTER";
    VehicleType["CAR"] = "CAR";
    VehicleType["VAN"] = "VAN";
})(VehicleType || (exports.VehicleType = VehicleType = {}));
var DeliveryAssignmentStatus;
(function (DeliveryAssignmentStatus) {
    DeliveryAssignmentStatus["ASSIGNED"] = "ASSIGNED";
    DeliveryAssignmentStatus["ACCEPTED"] = "ACCEPTED";
    DeliveryAssignmentStatus["PICKED_UP"] = "PICKED_UP";
    DeliveryAssignmentStatus["DELIVERED"] = "DELIVERED";
    DeliveryAssignmentStatus["REJECTED"] = "REJECTED";
    DeliveryAssignmentStatus["CANCELLED"] = "CANCELLED";
})(DeliveryAssignmentStatus || (exports.DeliveryAssignmentStatus = DeliveryAssignmentStatus = {}));
var OptionSelectionType;
(function (OptionSelectionType) {
    OptionSelectionType["SINGLE"] = "SINGLE";
    OptionSelectionType["MULTIPLE"] = "MULTIPLE";
})(OptionSelectionType || (exports.OptionSelectionType = OptionSelectionType = {}));
var CouponDiscountType;
(function (CouponDiscountType) {
    CouponDiscountType["PERCENTAGE"] = "PERCENTAGE";
    CouponDiscountType["FIXED"] = "FIXED";
})(CouponDiscountType || (exports.CouponDiscountType = CouponDiscountType = {}));
var AddressType;
(function (AddressType) {
    AddressType["HOME"] = "HOME";
    AddressType["WORK"] = "WORK";
    AddressType["OTHER"] = "OTHER";
})(AddressType || (exports.AddressType = AddressType = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["ORDER_UPDATE"] = "ORDER_UPDATE";
    NotificationType["DELIVERY_ALERT"] = "DELIVERY_ALERT";
    NotificationType["PROMOTION"] = "PROMOTION";
    NotificationType["SYSTEM"] = "SYSTEM";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
//# sourceMappingURL=index.js.map