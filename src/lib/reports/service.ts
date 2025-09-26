import type { NewReportFormState } from '@/components/NewReportForm';
import type { Report, ProductImage, Product } from '@/types/report';
import { createReport } from '@/lib/api/reports';

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
    lengthVal = Math.max(parsedLength, parsedWidth);
    widthVal = Math.min(parsedLength, parsedWidth);
  } else {
    lengthVal = parsedLength ?? parsedWidth ?? undefined;
    widthVal = parsedLength !== undefined && parsedWidth === undefined ? undefined : parsedWidth ?? undefined;
  }

  const images: ProductImage[] = workspaceImages.map((w) => workspaceToProductImage(w));

  const productRef: Product = {
    id: '',
    brand: '',
    series: '',
    model: '',
    images,
    category: { type: form.flooringType ?? '', material: form.material ?? '' },
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
