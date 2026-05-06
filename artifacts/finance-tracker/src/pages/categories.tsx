import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useGetCategories, getGetCategoriesQueryKey,
  useCreateCategory,
  CreateCategoryInputType
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Plus, Tags, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required"),
  type: z.enum(["income", "expense", "both"] as const),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#ec4899", "#f43f5e",
  "#f97316", "#fb923c", "#facc15", "#22c55e", "#10b981",
  "#14b8a6", "#06b6d4", "#3b82f6", "#64748b", "#94a3b8",
];

const TYPE_CONFIGS = {
  income: { icon: ArrowUpRight, label: "Income", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" },
  expense: { icon: ArrowDownRight, label: "Expense", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  both: { icon: RefreshCw, label: "Both", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

export default function Categories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories, isLoading } = useGetCategories({
    query: { queryKey: getGetCategoriesQueryKey() }
  });

  const createMutation = useCreateCategory();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", color: PRESET_COLORS[0], type: "expense" },
  });

  const onSubmit = (values: CategoryFormValues) => {
    createMutation.mutate({ data: { ...values, type: values.type as CreateCategoryInputType } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
        toast({ description: "Category created." });
        setIsFormOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ variant: "destructive", description: "Failed to create category." });
      }
    });
  };

  const incomeCategories = categories?.filter(c => c.type === "income") || [];
  const expenseCategories = categories?.filter(c => c.type === "expense") || [];
  const bothCategories = categories?.filter(c => c.type === "both") || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Categories</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {categories?.length ?? 0} categories to organize your finances
          </p>
        </div>
        <Button className="rounded-xl shadow-sm gap-2" onClick={() => setIsFormOpen(true)}>
          <Plus size={16} />
          <span className="hidden sm:inline">New Category</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array(9).fill(0).map((_, i) => (
            <Card key={i} className="shadow-sm border-border/60">
              <CardContent className="p-4 flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-14" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-6">
          {[
            { label: "Expense Categories", list: expenseCategories, type: "expense" },
            { label: "Income Categories", list: incomeCategories, type: "income" },
            { label: "Both", list: bothCategories, type: "both" },
          ].filter(g => g.list.length > 0).map(group => {
            const conf = TYPE_CONFIGS[group.type as keyof typeof TYPE_CONFIGS];
            const GroupIcon = conf.icon;
            return (
              <div key={group.type}>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${conf.bg}`}>
                    <GroupIcon size={14} className={conf.color} strokeWidth={2.5} />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{group.label}</h3>
                  <Badge variant="secondary" className="text-xs">{group.list.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.list.map((cat) => (
                    <Card key={cat.id} className="shadow-sm border-border/60 hover:shadow-md transition-all group">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex shrink-0 items-center justify-center transition-transform group-hover:scale-105"
                          style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                        >
                          <Tags size={17} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate">{cat.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-xs text-muted-foreground capitalize">{cat.type}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-sm border-border/60 border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Tags size={32} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-base text-foreground">No categories yet</p>
            <p className="text-sm mt-1 mb-4">Create categories to organize your income and expenses.</p>
            <Button className="rounded-xl" onClick={() => setIsFormOpen(true)}>
              <Plus size={15} className="mr-2" /> Create First Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl border-border/60">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold tracking-tight">New Category</DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Create a category to organize your transactions.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Groceries, Salary..." className="rounded-xl bg-muted/30 border-border/60" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {(["expense", "income", "both"] as const).map((type) => {
                          const conf = TYPE_CONFIGS[type];
                          const TypeIcon = conf.icon;
                          return (
                            <FormItem key={type} className="space-y-0">
                              <FormControl>
                                <RadioGroupItem value={type} className="sr-only" id={`type-${type}`} />
                              </FormControl>
                              <FormLabel
                                htmlFor={`type-${type}`}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all text-xs font-semibold ${
                                  field.value === type
                                    ? `border-primary bg-primary/5 ${conf.color}`
                                    : "border-border/60 text-muted-foreground hover:border-border"
                                }`}
                              >
                                <TypeIcon size={16} strokeWidth={2.5} />
                                {conf.label}
                              </FormLabel>
                            </FormItem>
                          );
                        })}
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-semibold">Color</FormLabel>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={`w-8 h-8 rounded-xl transition-all ${
                              field.value === color ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="rounded-xl px-6">
                  {createMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
