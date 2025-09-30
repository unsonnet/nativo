"""
Reports Lambda Handler

Handles all report-related API endpoints
EXACTLY matching the React app API specifications from src/lib/api/reportsApi.ts
"""

import logging
from typing import Dict, Any

from shared.utils import (
    success_response,
    error_response,
    parse_json_body,
    get_path_parameter,
    get_query_parameter,
    get_user_from_event,
    handle_cors_preflight,
    generate_id,
    current_timestamp,
    invoke_lambda_async,
    AWSConfig,
)
from shared.auth import require_auth
from shared.models import (
    Report,
    Product,
    ProductIndex,
    ProductImage,
    CreateReportRequest,
    CreateReportResponse,
    ListReportsResponse,
    SearchProductsRequest,
    SearchProductsResponse,
    DBReport,
)
from shared.database import ReportRepository


logger = logging.getLogger()
logger.setLevel(logging.INFO)


@require_auth
def list_reports(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /reports?page=1&limit=20
    List user reports

    EXACT match for ReportsApiService.listReports() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]

        # Get pagination parameters
        page = int(get_query_parameter(event, "page", "1"))
        limit = int(get_query_parameter(event, "limit", "20"))

        # Calculate offset
        offset = (page - 1) * limit

        # Get reports from database
        db_reports = ReportRepository.list_reports(user_id, limit=limit, offset=offset)
        total_count = ReportRepository.count_reports(user_id)

        # Convert DB reports to API format
        reports = []
        for db_report in db_reports:
            # Create Report with ProductIndex reference for list view
            report = Report(
                id=db_report.id,
                title=db_report.title,
                author=db_report.author,
                date=db_report.date,
                reference=db_report.reference,  # This should be ProductIndex in list view
                favorites=db_report.favorites,
            )
            reports.append(report.model_dump())

        response = ListReportsResponse(
            reports=reports, total=total_count, page=page, limit=limit
        )

        return success_response(response.model_dump())

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error listing reports: {e}")
        return error_response("Failed to list reports", 500)


@require_auth
def create_report(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    POST /reports
    Create a new report

    EXACT match for ReportsApiService.createReport() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]

        # Parse request body
        body = parse_json_body(event)
        create_request = CreateReportRequest(**body)

        # Generate report ID and timestamps
        report_id = generate_id()
        timestamp = current_timestamp()

        # Create DB report
        db_report = DBReport(
            id=report_id,
            title=create_request.title,
            author=user.get("name", user.get("username", "Unknown User")),
            date=timestamp.split("T")[0],  # Just the date part (YYYY-MM-DD)
            user_id=user_id,
            reference=create_request.reference.model_dump(),
            favorites=[],
        )

        # Save to database
        success = ReportRepository.create_report(db_report)
        if not success:
            return error_response("Failed to create report", 500)

        # If the reference product has an ID, trigger embedding computation
        if hasattr(create_request.reference, "id") and create_request.reference.id:
            try:
                # Invoke embeddings Lambda asynchronously
                embeddings_function = AWSConfig.get_embeddings_function_name()
                payload = {
                    "action": "compute_similarity_matrix",
                    "reference_product_id": create_request.reference.id,
                }
                invoke_lambda_async(embeddings_function, payload)
                logger.info(
                    f"Triggered embedding computation for product {create_request.reference.id}"
                )
            except Exception as e:
                logger.warning(f"Failed to trigger embedding computation: {e}")
                # Don't fail report creation if embedding computation fails

        # Return created report response
        response = CreateReportResponse(
            id=report_id,
            title=create_request.title,
            author=db_report.author,
            date=db_report.date,
        )

        return success_response(response.model_dump(), 201)

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error creating report: {e}")
        return error_response("Failed to create report", 500)


@require_auth
def get_report(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /reports/:reportId
    Get full report details

    EXACT match for ReportsApiService.getReport() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")

        # Get report from database
        db_report = ReportRepository.get_report(report_id, user_id)
        if not db_report:
            return error_response("Report not found", 404)

        # Convert to API format with full Product reference
        report = Report(
            id=db_report.id,
            title=db_report.title,
            author=db_report.author,
            date=db_report.date,
            reference=db_report.reference,  # Full Product object for detail view
            favorites=db_report.favorites,
        )

        return success_response(report.model_dump())

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error getting report: {e}")
        return error_response("Failed to get report", 500)


@require_auth
def update_report(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PATCH /reports/:reportId
    Update report metadata

    EXACT match for ReportsApiService.updateReport() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")

        # Parse request body
        body = parse_json_body(event)

        # Get current report
        db_report = ReportRepository.get_report(report_id, user_id)
        if not db_report:
            return error_response("Report not found", 404)

        # Update fields if provided
        if "title" in body:
            db_report.title = body["title"]

        # Update timestamp
        from datetime import datetime

        db_report.updated_at = datetime.utcnow()

        # Save to database
        success = ReportRepository.update_report(db_report)
        if not success:
            return error_response("Failed to update report", 500)

        # Convert to API format
        report = Report(
            id=db_report.id,
            title=db_report.title,
            author=db_report.author,
            date=db_report.date,
            reference=db_report.reference,
            favorites=db_report.favorites,
        )

        return success_response(report.model_dump())

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error updating report: {e}")
        return error_response("Failed to update report", 500)


@require_auth
def delete_report(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    DELETE /reports/:reportId
    Delete a report

    EXACT match for ReportsApiService.deleteReport() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")

        # Delete from database
        success = ReportRepository.delete_report(report_id, user_id)
        if not success:
            return error_response("Report not found", 404)

        return success_response({"success": True})

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error deleting report: {e}")
        return error_response("Failed to delete report", 500)


@require_auth
def search_products(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    POST /reports/:reportId/search
    Search for products within a report

    EXACT match for ReportsApiService.searchProducts() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")

        # Verify user owns the report
        db_report = ReportRepository.get_report(report_id, user_id)
        if not db_report:
            return error_response("Report not found", 404)

        # Parse search request
        body = parse_json_body(event)
        search_request = SearchProductsRequest(**body)

        # TODO: Implement actual product search
        # This would integrate with:
        # 1. Your product catalog/database
        # 2. Embedding-based similarity search via embeddings Lambda
        # 3. Traditional filtering based on SearchFilters

        # For now, return empty results
        logger.info(f"Product search request: {search_request}")

        response = SearchProductsResponse(
            products=[],
            total=0,
            page=search_request.page or 1,
            limit=search_request.limit or 20,
        )

        return success_response(response.model_dump())

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error searching products: {e}")
        return error_response("Failed to search products", 500)


@require_auth
def get_product(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /reports/:reportId/products/:productId
    Get full product details

    EXACT match for ReportsApiService.getProduct() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")
        product_id = get_path_parameter(event, "productId")

        # Verify user owns the report
        db_report = ReportRepository.get_report(report_id, user_id)
        if not db_report:
            return error_response("Report not found", 404)

        # TODO: Get product from your product catalog
        # This would integrate with your product database/service

        logger.info(f"Get product request: report={report_id}, product={product_id}")

        return error_response("Product not found", 404)

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error getting product: {e}")
        return error_response("Failed to get product", 500)


@require_auth
def update_favorite_status(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PUT /reports/:reportId/favorites/:productId
    Update favorite status of a product

    EXACT match for ReportsApiService.updateFavoriteStatus() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")
        product_id = get_path_parameter(event, "productId")

        # Parse request body
        body = parse_json_body(event)
        is_favorite = body.get("isFavorite", False)

        # Get current report
        db_report = ReportRepository.get_report(report_id, user_id)
        if not db_report:
            return error_response("Report not found", 404)

        # Update favorites list
        current_favorites = db_report.favorites or []

        if is_favorite and product_id not in current_favorites:
            current_favorites.append(product_id)
        elif not is_favorite and product_id in current_favorites:
            current_favorites.remove(product_id)

        # Update in database
        success = ReportRepository.update_report_favorites(
            report_id, user_id, current_favorites
        )
        if not success:
            return error_response("Failed to update favorites", 500)

        return success_response({"success": True})

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error updating favorite status: {e}")
        return error_response("Failed to update favorite status", 500)


@require_auth
def sync_favorites(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    PUT /reports/:reportId/favorites
    Bulk update favorites for a report

    EXACT match for ReportsApiService.syncFavorites() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")

        # Parse request body
        body = parse_json_body(event)
        favorites = body.get("favorites", [])

        if not isinstance(favorites, list):
            return error_response("Favorites must be an array", 400)

        # Update in database
        success = ReportRepository.update_report_favorites(
            report_id, user_id, favorites
        )
        if not success:
            return error_response("Report not found", 404)

        return success_response({"success": True})

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error syncing favorites: {e}")
        return error_response("Failed to sync favorites", 500)


@require_auth
def export_favorites(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    GET /reports/:reportId/export
    Export favorited products as ZIP file

    EXACT match for ReportsApiService.exportFavorites() in src/lib/api/reportsApi.ts
    """
    try:
        user = get_user_from_event(event)
        user_id = user["user_id"]
        report_id = get_path_parameter(event, "reportId")

        # Get report with favorites
        db_report = ReportRepository.get_report(report_id, user_id)
        if not db_report:
            return error_response("Report not found", 404)

        favorites = db_report.favorites or []
        if not favorites:
            return error_response("No favorites to export", 400)

        # TODO: Implement actual export functionality
        # This would:
        # 1. Fetch product details for all favorited products
        # 2. Generate a ZIP file with product images and data
        # 3. Upload to S3 and return a presigned URL
        # 4. Or return the ZIP file directly as a binary response

        return error_response("Export functionality not implemented yet", 501)

    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        logger.error(f"Error exporting favorites: {e}")
        return error_response("Failed to export favorites", 500)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for reports API
    Routes requests based on HTTP method and path
    """
    try:
        # Handle CORS preflight
        cors_response = handle_cors_preflight(event)
        if cors_response:
            return cors_response

        method = event.get("httpMethod", "").upper()
        path = event.get("path", "")

        # Route to appropriate handler
        if method == "GET" and path == "/reports":
            return list_reports(event, context)
        elif method == "POST" and path == "/reports":
            return create_report(event, context)
        elif method == "GET" and "/reports/" in path and path.count("/") == 2:
            return get_report(event, context)
        elif method == "PATCH" and "/reports/" in path and path.count("/") == 2:
            return update_report(event, context)
        elif method == "DELETE" and "/reports/" in path and path.count("/") == 2:
            return delete_report(event, context)
        elif method == "POST" and "/search" in path:
            return search_products(event, context)
        elif method == "GET" and "/products/" in path and "/export" not in path:
            return get_product(event, context)
        elif method == "PUT" and "/favorites/" in path and path.count("/") == 4:
            return update_favorite_status(event, context)
        elif method == "PUT" and path.endswith("/favorites"):
            return sync_favorites(event, context)
        elif method == "GET" and path.endswith("/export"):
            return export_favorites(event, context)
        else:
            return error_response("Not found", 404, "NOT_FOUND")

    except Exception as e:
        logger.error(f"Unhandled error in reports handler: {e}")
        return error_response("Internal server error", 500, "INTERNAL_ERROR")
