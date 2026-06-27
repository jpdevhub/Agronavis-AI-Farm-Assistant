import cv2
import numpy as np
from PIL import Image

MIN_WIDTH = 224
MIN_HEIGHT = 224

MIN_BLUR_SCORE = 100

MIN_BRIGHTNESS = 40
MAX_BRIGHTNESS = 220


def check_resolution(image):
    """
    Validate image dimensions.
    """
    width, height = image.size

    if width < MIN_WIDTH or height < MIN_HEIGHT:
        return False, (
            f"Image resolution is too low. "
            f"Minimum required: {MIN_WIDTH}x{MIN_HEIGHT}px"
        )

    return True, None


def check_blur(image):
    """
    Detect blurry images using Laplacian variance.
    """
    gray = cv2.cvtColor(
        np.array(image),
        cv2.COLOR_RGB2GRAY
    )

    blur_score = cv2.Laplacian(
        gray,
        cv2.CV_64F
    ).var()

    if blur_score < MIN_BLUR_SCORE:
        return (
            False,
            f"Image appears blurry (score={blur_score:.2f})",
            blur_score
        )

    return True, None, blur_score


def check_brightness(image):
    """
    Detect underexposed and overexposed images.
    """
    brightness = np.array(image).mean()

    if brightness < MIN_BRIGHTNESS:
        return (
            False,
            f"Image is too dark (brightness={brightness:.2f})",
            brightness
        )

    if brightness > MAX_BRIGHTNESS:
        return (
            False,
            f"Image is overexposed (brightness={brightness:.2f})",
            brightness
        )

    return True, None, brightness


def calculate_quality_score(
    blur_score,
    brightness
):
    """
    Compute a simple quality score (0-100).
    """

    score = 100

    if blur_score < 150:
        score -= 20

    if blur_score < 100:
        score -= 20

    if brightness < 60:
        score -= 20

    if brightness > 200:
        score -= 20

    return max(0, min(100, score))


def validate_image_quality(image):
    """
    Main image quality validation function.

    Returns:
    {
        "valid": bool,
        "reason": str | None,
        "quality_score": int,
        "blur_score": float,
        "brightness": float
    }
    """

    # Resolution check
    valid, reason = check_resolution(image)

    if not valid:
        return {
            "valid": False,
            "reason": reason,
            "quality_score": 0,
            "blur_score": None,
            "brightness": None,
        }

    # Blur check
    valid, reason, blur_score = check_blur(image)

    if not valid:
        return {
            "valid": False,
            "reason": reason,
            "quality_score": 0,
            "blur_score": round(blur_score, 2),
            "brightness": None,
        }

    # Brightness check
    valid, reason, brightness = check_brightness(image)

    if not valid:
        return {
            "valid": False,
            "reason": reason,
            "quality_score": 0,
            "blur_score": round(blur_score, 2),
            "brightness": round(brightness, 2),
        }

    quality_score = calculate_quality_score(
        blur_score,
        brightness
    )

    return {
        "valid": True,
        "reason": None,
        "quality_score": quality_score,
        "blur_score": round(blur_score, 2),
        "brightness": round(brightness, 2),
    }
