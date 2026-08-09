from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, BranchViewSet, SupplierViewSet, CategoryViewSet,
    UnitOfMeasureViewSet, ProductViewSet, InventoryStockViewSet,
    StockMovementLogViewSet, StockOperationViewSet, CustomerViewSet,
    PurchaseOrderViewSet, ShipmentViewSet, FiscalYearViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'branches', BranchViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'uom', UnitOfMeasureViewSet)
router.register(r'products', ProductViewSet)
router.register(r'stock', InventoryStockViewSet)
router.register(r'movement-ledger', StockMovementLogViewSet)
router.register(r'stock-operations', StockOperationViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'shipments', ShipmentViewSet)
router.register(r'fiscal-years', FiscalYearViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
