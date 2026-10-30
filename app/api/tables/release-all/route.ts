import { TableController } from '@/lib/controllers/table.controller';

export async function POST() {
  return TableController.releaseAll();
}
