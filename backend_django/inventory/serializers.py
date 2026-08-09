from rest_framework import serializers
from .models import (
    User, Branch, Supplier, Category, UnitOfMeasure,
    Product, InventoryStock, StockMovementLog, StockOperation,
    Customer, PurchaseOrder, POLineItem, Shipment, FiscalYear
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'branch', 'allowed_branches', 'avatar_url']

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(source='products.count', read_only=True)

    class Meta:
        model = Category
        fields = ['id', 'name', 'code', 'description', 'product_count']

class UnitOfMeasureSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitOfMeasure
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'

class InventoryStockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    product_barcode = serializers.CharField(source='product.barcode', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = InventoryStock
        fields = '__all__'

class StockMovementLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockMovementLog
        fields = '__all__'

class StockOperationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockOperation
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = Customer
        fields = '__all__'

class POLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = POLineItem
        fields = '__all__'

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = POLineItemSerializer(many=True, read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'

class ShipmentSerializer(serializers.ModelSerializer):
    source_branch_name = serializers.CharField(source='source_branch.name', read_only=True)
    destination_branch_name = serializers.CharField(source='destination_branch.name', read_only=True)

    class Meta:
        model = Shipment
        fields = '__all__'

class FiscalYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = FiscalYear
        fields = '__all__'
