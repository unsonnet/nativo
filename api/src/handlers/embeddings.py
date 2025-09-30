"""
Embeddings Lambda Handler

Heavy ML operations for product embedding computation
This is where you integrate your existing embedding code

Dependencies: onnxruntime, opencv, hdbscan, faiss (ML layer)
Configuration: High memory (3GB), long timeout (15min)
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import boto3
from botocore.exceptions import ClientError

# Heavy ML imports - only in this Lambda
try:
    import onnxruntime as ort
    import cv2
    import hdbscan
    import faiss
except ImportError as e:
    logging.error(f"Heavy ML dependencies not available: {e}")
    # This Lambda won't work without these dependencies

from shared.utils import (
    success_response,
    error_response,
    parse_json_body,
    upload_to_s3,
    download_from_s3,
    AWSConfig,
)
from shared.models import DBProductEmbedding, Product
from shared.database import EmbeddingRepository


logger = logging.getLogger()
logger.setLevel(logging.INFO)

# AWS clients
s3_client = boto3.client("s3")


class EmbeddingProcessor:
    """
    Handles the heavy ML processing for product embeddings

    *** INTEGRATE YOUR EXISTING EMBEDDING CODE HERE ***

    Replace the placeholder methods with your actual:
    - Image processing pipeline
    - ONNX model inference
    - Embedding computation logic
    """

    def __init__(self):
        self.model_session = None
        self.similarity_bucket = AWSConfig.get_similarity_bucket()
        self.model_version = "v1.0"  # Update with your model version
        self._initialize_model()

    def _initialize_model(self):
        """
        Initialize your ONNX model for embedding computation

        *** REPLACE WITH YOUR MODEL INITIALIZATION ***
        """
        try:
            # TODO: Replace with your actual model path/initialization
            # Example:
            # model_path = '/opt/ml/model/your_embedding_model.onnx'
            # self.model_session = ort.InferenceSession(model_path)

            logger.info("Embedding model initialized (placeholder)")
        except Exception as e:
            logger.error(f"Failed to initialize embedding model: {e}")
            raise

    def compute_product_embedding(
        self, product_data: Dict[str, Any]
    ) -> Optional[np.ndarray]:
        """
        Compute embedding vector for a product

        *** INTEGRATE YOUR EXISTING EMBEDDING COMPUTATION HERE ***

        Args:
            product_data: Product data including image URLs from product.images

        Returns:
            numpy array of embedding vector or None if failed
        """
        try:
            product_id = product_data.get("id")
            images = product_data.get("images", [])

            logger.info(
                f"Computing embedding for product {product_id} with {len(images)} images"
            )

            if not images:
                logger.warning(f"No images found for product {product_id}")
                return None

            # *** REPLACE THIS SECTION WITH YOUR ACTUAL CODE ***

            # Your embedding computation would typically:
            # 1. Download images from S3 using the image URLs/IDs
            # 2. Preprocess images (resize, normalize, etc.)
            # 3. Run through your computer vision pipeline
            # 4. Extract features using your ONNX model
            # 5. Return the embedding vector

            # Placeholder: return random vector for now
            embedding_vector = np.random.random(512).astype(np.float32)

            # *** END REPLACEMENT SECTION ***

            logger.info(f"Successfully computed embedding for product {product_id}")
            return embedding_vector

        except Exception as e:
            logger.error(f"Failed to compute embedding for product {product_id}: {e}")
            return None

    def compute_similarity_matrix(
        self, reference_product_id: str, reference_product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Compute similarity matrix from reference product to all products in your catalog

        Args:
            reference_product_id: ID of the reference product
            reference_product_data: Product data for the reference

        Returns:
            Dict with similarity results and metadata
        """
        try:
            # Get or compute reference embedding
            ref_embedding = self._get_or_compute_embedding(
                reference_product_id, reference_product_data
            )
            if ref_embedding is None:
                raise ValueError("Failed to compute reference embedding")

            # *** INTEGRATE WITH YOUR PRODUCT CATALOG ***

            # You'll need to:
            # 1. Get all products from your product catalog/database
            # 2. For each product, get or compute its embedding
            # 3. Compute similarity scores

            # TODO: Replace with actual product catalog integration
            all_products = self._get_all_products_from_catalog()

            similarities = []

            for product in all_products:
                if product["id"] == reference_product_id:
                    continue  # Skip self

                # Get or compute embedding for this product
                product_embedding = self._get_or_compute_embedding(
                    product["id"], product
                )
                if product_embedding is None:
                    continue

                # Compute cosine similarity
                similarity = self._cosine_similarity(ref_embedding, product_embedding)
                similarities.append(
                    {"product_id": product["id"], "similarity_score": float(similarity)}
                )

            # Sort by similarity (highest first)
            similarities.sort(key=lambda x: x["similarity_score"], reverse=True)

            # Store in S3 as compressed numpy file
            s3_key = self._store_similarity_matrix(reference_product_id, similarities)

            result = {
                "reference_product_id": reference_product_id,
                "similarities_computed": len(similarities),
                "top_similar": similarities[:10] if similarities else [],
                "s3_key": s3_key,
                "model_version": self.model_version,
            }

            logger.info(
                f"Computed similarity matrix for {reference_product_id}: {len(similarities)} products"
            )
            return result

        except Exception as e:
            logger.error(f"Failed to compute similarity matrix: {e}")
            raise

    def _get_all_products_from_catalog(self) -> List[Dict[str, Any]]:
        """
        Get all products from your product catalog

        *** REPLACE WITH YOUR PRODUCT CATALOG INTEGRATION ***

        Returns:
            List of product dictionaries
        """
        # TODO: Replace with actual product catalog query
        # This might involve:
        # - Querying your product database
        # - Calling your product service API
        # - Reading from S3/file system

        # Placeholder: return empty list
        logger.warning(
            "Using placeholder product catalog - replace with actual implementation"
        )
        return []

    def _get_or_compute_embedding(
        self, product_id: str, product_data: Dict[str, Any]
    ) -> Optional[np.ndarray]:
        """Get existing embedding or compute new one"""
        # Check if embedding already exists in database
        existing_embedding = EmbeddingRepository.get_embedding(product_id)
        if existing_embedding:
            return np.array(existing_embedding.embedding_vector)

        # Compute new embedding
        embedding_vector = self.compute_product_embedding(product_data)
        if embedding_vector is None:
            return None

        # Store in database
        db_embedding = DBProductEmbedding(
            product_id=product_id,
            embedding_vector=embedding_vector.tolist(),
            model_version=self.model_version,
            vector_dimension=len(embedding_vector),
        )

        success = EmbeddingRepository.store_embedding(db_embedding)
        if not success:
            logger.warning(f"Failed to store embedding for product {product_id}")

        return embedding_vector

    def _cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Compute cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def _store_similarity_matrix(
        self, reference_product_id: str, similarities: List[Dict]
    ) -> str:
        """Store similarity matrix in S3 as compressed numpy file"""
        try:
            # Prepare data for storage
            similarity_data = {
                "reference_product_id": reference_product_id,
                "similarities": similarities,
                "computed_at": datetime.utcnow().isoformat(),
                "model_version": self.model_version,
            }

            # Convert to compressed bytes
            import io

            buffer = io.BytesIO()
            np.savez_compressed(buffer, **similarity_data)
            buffer.seek(0)

            # Upload to S3
            s3_key = f"similarity_matrices/{reference_product_id}.npz"
            upload_to_s3(self.similarity_bucket, s3_key, buffer.getvalue())

            logger.info(f"Stored similarity matrix for {reference_product_id} in S3")
            return s3_key

        except Exception as e:
            logger.error(f"Failed to store similarity matrix: {e}")
            raise

    def get_similarity_matrix(self, reference_product_id: str) -> Optional[List[Dict]]:
        """Retrieve similarity matrix from S3"""
        try:
            s3_key = f"similarity_matrices/{reference_product_id}.npz"
            data = download_from_s3(self.similarity_bucket, s3_key)

            # Load compressed numpy data
            import io

            buffer = io.BytesIO(data)
            loaded_data = np.load(buffer, allow_pickle=True)

            similarities = loaded_data["similarities"].tolist()
            return similarities

        except FileNotFoundError:
            logger.info(
                f"No similarity matrix found for product {reference_product_id}"
            )
            return None
        except Exception as e:
            logger.error(f"Failed to load similarity matrix: {e}")
            return None


def compute_embedding_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler for computing embeddings for a single product
    POST /embeddings/compute
    """
    try:
        body = parse_json_body(event)
        product_data = body.get("product_data")

        if not product_data or "id" not in product_data:
            return error_response("product_data with id is required", 400)

        processor = EmbeddingProcessor()

        # Compute embedding
        embedding_vector = processor.compute_product_embedding(product_data)
        if embedding_vector is None:
            return error_response("Failed to compute embedding", 500)

        return success_response(
            {
                "product_id": product_data["id"],
                "embedding_computed": True,
                "vector_dimension": len(embedding_vector),
            }
        )

    except Exception as e:
        logger.error(f"Error computing embedding: {e}")
        return error_response("Failed to compute embedding", 500)


def compute_similarity_matrix_handler(
    event: Dict[str, Any], context: Any
) -> Dict[str, Any]:
    """
    Handler for computing similarity matrix from reference product to all products
    POST /embeddings/similarity
    """
    try:
        body = parse_json_body(event)
        reference_product_id = body.get("reference_product_id")
        reference_product_data = body.get("reference_product_data", {})

        if not reference_product_id:
            return error_response("reference_product_id is required", 400)

        processor = EmbeddingProcessor()
        result = processor.compute_similarity_matrix(
            reference_product_id, reference_product_data
        )

        return success_response(result)

    except Exception as e:
        logger.error(f"Error computing similarity matrix: {e}")
        return error_response("Failed to compute similarity matrix", 500)


def get_similarity_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handler for retrieving similarity results
    GET /embeddings/similarity/:productId
    """
    try:
        from shared.utils import get_path_parameter

        reference_product_id = get_path_parameter(event, "productId")

        processor = EmbeddingProcessor()
        similarities = processor.get_similarity_matrix(reference_product_id)

        if similarities is None:
            return error_response("Similarity matrix not found", 404)

        return success_response(
            {
                "reference_product_id": reference_product_id,
                "similarities": similarities[:50],  # Return top 50
            }
        )

    except Exception as e:
        logger.error(f"Error getting similarity matrix: {e}")
        return error_response("Failed to get similarity matrix", 500)


def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main handler for embeddings Lambda
    Routes to specific embedding operations
    """
    try:
        # Handle direct invocation from other Lambdas
        if "action" in event:
            action = event["action"]
            if action == "compute_similarity_matrix":
                return compute_similarity_matrix_handler(event, context)
            elif action == "compute_embedding":
                return compute_embedding_handler(event, context)

        # Handle HTTP requests
        path = event.get("path", "")
        method = event.get("httpMethod", "GET")

        if method == "POST" and "/compute" in path:
            return compute_embedding_handler(event, context)
        elif method == "POST" and "/similarity" in path:
            return compute_similarity_matrix_handler(event, context)
        elif method == "GET" and "/similarity/" in path:
            return get_similarity_handler(event, context)
        else:
            return error_response("Not found", 404)

    except Exception as e:
        logger.error(f"Unhandled error in embeddings handler: {e}")
        return error_response("Internal server error", 500)
