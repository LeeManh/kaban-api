export const LABEL_SELECT = { select: { id: true, name: true, color: true } };
export const ASSIGNEE_SELECT = {
  select: { id: true, name: true, email: true },
};
export const COUNT_SELECT = { select: { comments: true, attachments: true } };
export const CHECKLIST_ITEMS_SELECT = {
  select: { items: { select: { isDone: true } } },
};

type CardWithChecklists = { checklists: { items: { isDone: boolean }[] }[] };

export function withChecklistProgress<T extends CardWithChecklists>(card: T) {
  const { checklists, ...rest } = card;
  const items = checklists.flatMap((c) => c.items);
  return {
    ...rest,
    checklistProgress: {
      done: items.filter((i) => i.isDone).length,
      total: items.length,
    },
  };
}
