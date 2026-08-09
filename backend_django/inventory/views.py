from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone

from .models import (
    User, Branch, Supplier, Category, UnitOfMeasure,
    Product, InventoryStock, StockMovementLog, StockOperation,
    Customer, PurchaseOrder, Shipment, FiscalYear
)
from .serializers import (
    UserSerializer, BranchSerializer, SupplierSerializer, CategorySerializer,
    UnitOfMeasureSerializer, ProductSerializer, InventoryStockSerializer,
    StockMovementLogSerializer, StockOperationSerializer, CustomerSerializer,
    PurchaseOrderSerializer, ShipmentSerializer, FiscalYearSerializer
)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone', 'pan_vat_number']

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class UnitOfMeasureViewSet(viewsets.ModelViewSet):
    queryset = UnitOfMeasure.objects.all()
    serializer_class = UnitOfMeasureSerializer

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'product_group', 'tracking_type']
    search_fields = ['name', 'sku', 'barcode', 'description']

    @action(detail=False, methods=['get'], url_path='lookup-barcode')
    def lookup_barcode(self, request):
        barcode = request.query_params.get('barcode', '').strip()
        if not barcode:
            return Response({"error": "Barcode query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            product = Product.objects.get(barcode=barcode)
            return Response(ProductSerializer(product).data)
        except Product.DoesNotExist:
            return Response({"detail": "Product with this barcode not found"}, status=status.HTTP_404_NOT_FOUND)

class InventoryStockViewSet(viewsets.ModelViewSet):
    queryset = InventoryStock.objects.select_related('product', 'branch').all()
    serializer_class = InventoryStockSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch', 'product']
    search_fields = ['product__name', 'product__sku', 'product__barcode']

    @action(detail=False, methods=['post'], url_path='stock-out')
    def stock_out(self, request):
        """
        Stock-Out or Consumable Issue endpoint:
        Deducts quantity from InventoryStock and creates an audit log entry in StockMovementLog and StockOperation.
        """
        product_id = request.data.get('product_id')
        branch_id = request.data.get('branch_id')
        quantity = int(request.data.get('quantity', 0))
        reason = request.data.get('reason', 'Consumable Issue / Stock Out')
        operator_name = request.data.get('operator_name', 'System User')
        date_bs = request.data.get('date_bs', '2081/11/25')

        if not product_id or not branch_id or quantity <= 0:
            return Response(
                {"error": "Valid product_id, branch_id, and positive quantity are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            try:
                stock_item = InventoryStock.objects.select_for_update().get(
                    product_id=product_id,
                    branch_id=branch_id
                )
            except InventoryStock.DoesNotExist:
                return Response(
                    {"error": "No stock record found for this product at the specified branch"},
                    status=status.HTTP_404_NOT_FOUND
                )

            if stock_item.quantity_on_hand < quantity:
                return Response(
                    {"error": f"Insufficient stock. Available: {stock_item.quantity_on_hand}, Requested: {quantity}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            stock_item.quantity_on_hand -= quantity
            stock_item.save()

            # Record Stock Operation
            tx_num = f"OUT-{int(timezone.now().timestamp())}"
            StockOperation.objects.create(
                reference_number=tx_num,
                type='STOCK_OUT',
                branch_id=branch_id,
                product_id=product_id,
                quantity_changed=-quantity,
                cost_per_unit=stock_item.product.cost_price,
                total_value=stock_item.product.cost_price * quantity,
                reason=reason,
                inspector_name=operator_name,
                date_ad=timezone.now().date(),
                date_bs=date_bs,
                fiscal_year="2081/82",
                status='COMPLETED'
            )

            # Record Stock Movement Audit Log
            StockMovementLog.objects.create(
                product_id=product_id,
                product_name=stock_item.product.name,
                product_sku=stock_item.product.sku,
                branch_id=branch_id,
                branch_name=stock_item.branch.name,
                change_type='STOCK_OUT',
                quantity_changed=-quantity,
                quantity_after=stock_item.quantity_on_hand,
                transaction_number=tx_num,
                date_ad=timezone.now().date(),
                date_bs=date_bs,
                operator_name=operator_name,
                reference_note=reason
            )

            return Response({
                "message": "Stock out successful",
                "transaction_number": tx_num,
                "remaining_quantity": stock_item.quantity_on_hand
            })

class StockMovementLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = StockMovementLog.objects.all()
    serializer_class = StockMovementLogSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch', 'change_type']
    search_fields = ['product_name', 'product_sku', 'transaction_number', 'operator_name']

class StockOperationViewSet(viewsets.ModelViewSet):
    queryset = StockOperation.objects.all()
    serializer_class = StockOperationSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch', 'type', 'status']
    search_fields = ['reference_number', 'technician_name', 'reason', 'inspector_name']

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'code', 'phone', 'email']

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.prefetch_related('items').all()
    serializer_class = PurchaseOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['branch', 'status']
    search_fields = ['po_number', 'supplier_name']

class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.all()
    serializer_class = ShipmentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['source_branch', 'destination_branch', 'status']
    search_fields = ['tracking_code']

class FiscalYearViewSet(viewsets.ModelViewSet):
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
