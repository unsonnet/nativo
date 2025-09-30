import type { NewReportFormState } from '@/components/NewReportForm';
import type { Report, ProductImage, Product } from '@/types/report';
import { createReport } from '@/lib/api/reports';

// Helper function to calculate greatest common divisor
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Helper function to simplify a ratio to its lowest terms
function simplifyRatio(length: number, width: number): [number, number] {
  // Convert to integers by multiplying by a scale factor to handle decimals
  const scale = 1000; // Handle up to 3 decimal places
  const lengthInt = Math.round(length * scale);
  const widthInt = Math.round(width * scale);
  
  const divisor = gcd(lengthInt, widthInt);
  const simplifiedLength = lengthInt / divisor;
  const simplifiedWidth = widthInt / divisor;
  
  // Ensure larger number is on the left (length), smaller on the right (width)
  if (simplifiedLength >= simplifiedWidth) {
    return [simplifiedLength, simplifiedWidth];
  } else {
    return [simplifiedWidth, simplifiedLength];
  }
}

// Convert workspace image to ProductImage. Mask/selection will be empty for now;
// later we can extract mask canvas data from the overlay hook.
function workspaceToProductImage(wi: { id: string; name: string; url: string; mask?: string; selection?: ProductImage['selection'] }) : ProductImage {
  return {
    // leave id blank per request
    id: '',
    url: wi.url,
    mask: wi.mask ?? undefined,
    selection: wi.selection ?? undefined,
  };
}

export async function packageAndCreateReport(
  form: NewReportFormState & { author: string },
  workspaceImages: { id: string; name: string; url: string; mask?: string; selection?: ProductImage['selection'] }[]
) : Promise<Report<Product>> {
  const unitForDims: 'none' | 'in' = form.units === 'absolute' ? 'in' : 'none';

  const parsedLength = form.length === '' ? undefined : Number.parseFloat(form.length);
  const parsedWidth = form.width === '' ? undefined : Number.parseFloat(form.width);
  const parsedThickness = form.thickness === '' ? undefined : Number.parseFloat(form.thickness);

  // reorder so length is the larger dimension when both provided
  let lengthVal: number | undefined = undefined;
  let widthVal: number | undefined = undefined;
  
  if (parsedLength !== undefined && parsedWidth !== undefined) {
    if (form.units === 'relative') {
      // For relative units, simplify the ratio to lowest terms
      // Examples: 4:2 becomes 2:1, 6:9 becomes 2:3, 12:8 becomes 3:2
      const [simplifiedLength, simplifiedWidth] = simplifyRatio(parsedLength, parsedWidth);
      lengthVal = simplifiedLength;
      widthVal = simplifiedWidth;
    } else {
      // For absolute units, keep original behavior (larger value becomes length)
      lengthVal = Math.max(parsedLength, parsedWidth);
      widthVal = Math.min(parsedLength, parsedWidth);
    }
  } else {
    // When only one dimension is provided, map it to length and leave width undefined
    if (parsedLength !== undefined) {
      lengthVal = parsedLength;
      widthVal = undefined;
    } else if (parsedWidth !== undefined) {
      lengthVal = parsedWidth;  // Map width input to length field
      widthVal = undefined;     // Leave width undefined
    } else {
      lengthVal = undefined;
      widthVal = undefined;
    }
  }

  const images: ProductImage[] = workspaceImages.map((w) => workspaceToProductImage(w));

  const productRef: Product = {
    id: '',
    brand: '',
    // series is optional in the Product type; leave undefined when not provided
    series: undefined,
    model: '',
    images,
    category: {
      type: form.flooringType && form.flooringType !== 'Any' ? form.flooringType : undefined,
      material: form.material && form.material !== 'Any' ? form.material : undefined,
      look: form.look && form.look !== 'Any' ? form.look : undefined,
      texture: form.texture && form.texture !== 'Any' ? form.texture : undefined,
      finish: form.finish && form.finish !== 'Any' ? form.finish : undefined,
      edge: form.edge && form.edge !== 'Any' ? form.edge : undefined,
    },
    formats: [
      {
        length: lengthVal === undefined ? undefined : { val: lengthVal, unit: unitForDims },
        width: widthVal === undefined ? undefined : { val: widthVal, unit: unitForDims },
        thickness: parsedThickness === undefined || Number.isNaN(parsedThickness) ? undefined : { val: parsedThickness, unit: 'mm' },
        vendors: [],
      },
    ],
  };

  const payload: Omit<Report<Product>, 'id' | 'date'> = {
    title: form.reportName,
    author: form.author,
    reference: productRef,
  };

  return createReport(payload);
}
