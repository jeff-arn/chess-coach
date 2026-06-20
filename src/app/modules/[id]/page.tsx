import { getModule } from '@/curriculum/loader';
import { ModuleView } from './ModuleView';

export default async function ModulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Named `lessonModule`, not `module`: Next.js's no-assign-module-variable lint rule
  // forbids assigning to a `module` binding (it shadows the CommonJS global).
  const lessonModule = getModule(id);
  if (!lessonModule) return <section className="panel">Module not found.</section>;
  return <ModuleView module={lessonModule} />;
}
