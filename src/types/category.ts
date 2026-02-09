export interface Category {
    id: string;
    name: string;
    description: string | null;
    parentId: string | null;
    departmentId: string;
    createdAt: string;
    updatedAt: string;
    children?: Category[];
    parent?: Category;
}

export type CategoryTree = Category[];
