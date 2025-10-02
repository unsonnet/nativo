# K9 Export CSV Structure

## Overview
The new CSV structure uses a **partial collapse** approach where each product can span multiple rows - one row per format/vendor combination. This makes product comparison much easier while maintaining all the detailed information.

## CSV Column Structure

### Core Identification
- **`row_index`** (First column) - Links to image folder name for easy identification
- **`type`** - Either "REFERENCE" or "FAVORITE"

### Product Information (Repeated in each row)
- **`brand`** - Product brand name
- **`series`** - Product series (optional)
- **`model`** - Product model name

### Category Information (Repeated in each row)
- **`category_type`** - e.g., "flooring"
- **`category_material`** - e.g., "wood", "laminate"
- **`category_look`** - e.g., "natural", "rustic"
- **`category_texture`** - e.g., "smooth", "textured"
- **`category_finish`** - e.g., "matte", "satin"
- **`category_edge`** - e.g., "beveled", "square"

### Format Information (One per row)
- **`format_length_val`** - Length value
- **`format_length_unit`** - Length unit (e.g., "in")
- **`format_width_val`** - Width value
- **`format_width_unit`** - Width unit (e.g., "in")
- **`format_thickness_val`** - Thickness value
- **`format_thickness_unit`** - Thickness unit (e.g., "mm")

### Vendor Information (One per row)
- **`vendor_sku`** - SKU/Product code
- **`vendor_store`** - Store/Retailer name
- **`vendor_name`** - Product name at this vendor
- **`vendor_price_val`** - Price value
- **`vendor_price_unit`** - Price unit (e.g., "usd")
- **`vendor_discontinued`** - Boolean discontinued status
- **`vendor_url`** - Link to product page

## Example Structure

For a product with 2 formats, where the first format has 2 vendors and the second has 1 vendor, you would get **3 rows** in the CSV:

```csv
row_index,type,brand,model,...,format_length_val,format_width_val,vendor_sku,vendor_store,vendor_price_val
1,FAVORITE,BrandA,ModelX,...,48,6,SKU123,Store1,5.99
1,FAVORITE,BrandA,ModelX,...,48,6,SKU124,Store2,5.49
1,FAVORITE,BrandA,ModelX,...,36,6,SKU125,Store1,4.99
```

## Benefits for Comparison

1. **Easy Filtering**: Filter by any vendor, format size, or price range
2. **Simple Sorting**: Sort by price, brand, or any other field
3. **Direct Image Reference**: `row_index` directly corresponds to image folder names
4. **Vendor Analysis**: Compare pricing across vendors for the same product
5. **Format Analysis**: Compare different sizes/formats of products
6. **Pivot Table Friendly**: Perfect for Excel pivot tables and data analysis

## Image Folder Mapping

The `row_index` directly maps to image folder names:
- `row_index: 0` → `images/000_BrandName_ModelName_REFERENCE/`
- `row_index: 1` → `images/001_BrandName_ModelName/`
- `row_index: 2` → `images/002_BrandName_ModelName/`

This makes it super easy to find the images that correspond to any row in your analysis!