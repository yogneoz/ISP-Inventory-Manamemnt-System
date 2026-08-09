from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

# Custom User Model
class User(AbstractUser):
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('INVENTORY_MANAGER', 'Inventory Manager'),
        ('BRANCH_MANAGER', 'Branch Manager'),
        ('FRONT_DESK', 'Front Desk'),
        ('ACCOUNTANT', 'Accountant'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default='INVENTORY_MANAGER')
    branch = models.ForeignKey('Branch', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    allowed_branches = models.ManyToManyField('Branch', blank=True, related_name='allowed_users')
    avatar_url = models.URLField(max_length=500, blank=True, null=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class Branch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, null=True)
    is_headquarters = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    allow_procurement = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Branches"

    def __str__(self):
        return f"{self.name} ({self.code})"


class Supplier(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=150, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    pan_vat_number = models.CharField(max_length=50, blank=True, null=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=5.0)

    def __str__(self):
        return self.name


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=150, unique=True)
    code = models.CharField(max_length=30, unique=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name


class UnitOfMeasure(models.Model):
    TYPE_CHOICES = [
        ('Count', 'Count'),
        ('Length', 'Length'),
        ('Weight', 'Weight'),
        ('Volume', 'Volume'),
        ('Package', 'Package'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    symbol = models.CharField(max_length=20)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES, default='Count')
    is_base_unit = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.symbol})"


class Product(models.Model):
    GROUP_CHOICES = [
        ('Product Item', 'Product Item'),
        ('Fixed Asset', 'Fixed Asset'),
        ('Consumable Item', 'Consumable Item'),
    ]
    TRACKING_CHOICES = [
        ('SERIAL_MAC_PON', 'Serial / MAC / PON Tracking'),
        ('QUANTITY_ONLY', 'Quantity Only Tracking'),
    ]
    DEPRECIATION_CHOICES = [
        ('STRAIGHT_LINE', 'Straight Line Method'),
        ('DECLINING_BALANCE', 'Declining Balance Method'),
        ('WRITTEN_DOWN_VALUE', 'Written Down Value Method'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sku = models.CharField(max_length=100, unique=True, db_index=True)
    barcode = models.CharField(max_length=100, unique=True, db_index=True, blank=True, null=True)
    name = models.CharField(max_length=255, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    product_group = models.CharField(max_length=50, choices=GROUP_CHOICES, default='Product Item')
    unit = models.CharField(max_length=30, default='Pcs')
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=13.00)  # 13% VAT
    min_reorder_level = models.IntegerField(default=5)
    requires_serial_tracking = models.BooleanField(default=False)
    tracking_type = models.CharField(max_length=30, choices=TRACKING_CHOICES, default='QUANTITY_ONLY')
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(max_length=500, blank=True, null=True)

    # Depreciation settings (for Fixed Assets)
    depreciation_method = models.CharField(max_length=50, choices=DEPRECIATION_CHOICES, blank=True, null=True)
    depreciation_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    useful_life_years = models.IntegerField(blank=True, null=True)
    salvage_value_percent = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} [{self.sku}]"


class InventoryStock(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='stocks')
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='stocks')
    quantity_on_hand = models.IntegerField(default=0)
    damaged_qty = models.IntegerField(default=0)
    reserved_qty = models.IntegerField(default=0)
    incoming_qty = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('product', 'branch')
        verbose_name_plural = "Inventory Stocks"

    def __str__(self):
        return f"{self.product.name} @ {self.branch.name}: {self.quantity_on_hand} on hand"


class StockMovementLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movement_logs')
    product_name = models.CharField(max_length=255)
    product_sku = models.CharField(max_length=100)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='movement_logs')
    branch_name = models.CharField(max_length=150)
    change_type = models.CharField(max_length=100)  # e.g., 'PURCHASE_RECEIPT', 'CONSUMABLE_ISSUE', 'DAMAGE'
    quantity_changed = models.IntegerField()  # + or -
    quantity_after = models.IntegerField()
    transaction_number = models.CharField(max_length=100, db_index=True)
    date_ad = models.DateField()
    date_bs = models.CharField(max_length=20)
    operator_name = models.CharField(max_length=150)
    reference_note = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.transaction_number}: {self.change_type} ({self.quantity_changed})"


class StockOperation(models.Model):
    TYPE_CHOICES = [
        ('PULLOUT', 'Pullout'),
        ('DAMAGE', 'Damage Logging'),
        ('STOCK_OUT', 'Stock Out / Dispatch'),
        ('MANUAL_ADJUSTMENT', 'Manual Adjustment'),
        ('CONSUMABLE_ISSUE', 'Consumable Issue'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=100, unique=True, db_index=True)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    technician_name = models.CharField(max_length=150, blank=True, null=True)
    work_order_ref = models.CharField(max_length=100, blank=True, null=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='operations')
    destination_warehouse_name = models.CharField(max_length=150, blank=True, null=True)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    quantity_changed = models.IntegerField(default=0)
    cost_per_unit = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    reason = models.TextField()
    inspector_name = models.CharField(max_length=150)
    date_ad = models.DateField()
    date_bs = models.CharField(max_length=20)
    fiscal_year = models.CharField(max_length=20)
    status = models.CharField(max_length=50, default='LOGGED')

    created_at = models.DateTimeField(auto_now_add=True)


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=50)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField()
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='customers')
    status = models.CharField(max_length=30, default='ACTIVE')

    def __str__(self):
        return f"{self.name} ({self.code})"


class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('APPROVED', 'Approved'),
        ('SENT', 'Sent to Vendor'),
        ('RECEIVED', 'Received'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=100, unique=True)
    supplier_name = models.CharField(max_length=200)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='purchase_orders')
    order_date_ad = models.DateField()
    order_date_bs = models.CharField(max_length=20)
    expected_delivery_date_ad = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    subtotal_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"PO {self.po_number} - {self.supplier_name}"


class POLineItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=13.0)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2)
    total = models.DecimalField(max_digits=14, decimal_places=2)


class Shipment(models.Model):
    STATUS_CHOICES = [
        ('DISPATCHED', 'Dispatched'),
        ('IN_TRANSIT', 'In Transit'),
        ('DELIVERED', 'Delivered'),
        ('RECEIVED', 'Received'),
        ('DISCREPANCY', 'Discrepancy Logged'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_code = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=50, default='INTER_BRANCH')
    source_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='outgoing_shipments', null=True, blank=True)
    destination_branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='incoming_shipments')
    dispatch_date_ad = models.DateField()
    dispatch_date_bs = models.CharField(max_length=20)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='IN_TRANSIT')
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Shipment {self.tracking_code} ({self.status})"


class FiscalYear(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)  # e.g., "2081/82"
    start_date_ad = models.DateField()
    end_date_ad = models.DateField()
    start_date_bs = models.CharField(max_length=20)
    end_date_bs = models.CharField(max_length=20)
    is_current = models.BooleanField(default=False)
    is_closed = models.BooleanField(default=False)

    def __str__(self):
        return self.code
