export type MemoryForm = {
  title: string;
  content: string;
  source: string;
  tags: string;
  importance: string;
};

export function validateMemoryForm(form: MemoryForm): string | null {
  if (!form.title.trim()) {
    return "Le titre est obligatoire.";
  }
  if (!form.content.trim()) {
    return "Le contenu est obligatoire.";
  }
  if (form.content.trim().length < 12) {
    return "Le contenu doit etre plus descriptif.";
  }
  return null;
}
