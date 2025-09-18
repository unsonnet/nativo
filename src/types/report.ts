export type Product = {
  id: string;
  brand: string;
  model: string;
  images: string[];
};

export type Report = {
  id: string;
  subject: string;
  date: string; // ISO string
  reference: Product;
};
