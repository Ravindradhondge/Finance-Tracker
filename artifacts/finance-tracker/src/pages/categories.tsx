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
import { Plus, Tags } from "lucide-react";
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
  "#4d9b7a", "#67b095", "#81c4af", /* greens/teals */
  "#d49a89", "#c97e6a", "#bd634b", /* warm roses */
  "#d6a655", "#e3b86a", "#efcb80", /* warm ochre */
  "#738a9e", "#8c9fb1", "#a6b5c5", /* soft slate */
  "#a08cb3", "#b4a3c6", "#c8b9d9", /* soft lavender */
];

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
    defaultValues: {
      name: "",
      color: PRESET_COLORS[0],
      type: "expense",
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    createMutation.mutate({ data: { ...values, type: values.type as CreateCategoryInputType } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCategoriesQueryKey() });
        toast({ description: "Category created gracefully." });
        setIsFormOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ variant: "destructive", description: "Failed to create category." });
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-medium tracking-tight mb-2">Categories</h2>
          <p className="text-muted-foreground leading-relaxed">
            Organize your ledger with custom tags and colors.
          </p>
        </div>
        <Button 
          className="rounded-xl shadow-sm px-5" 
          onClick={() => setIsFormOpen(true)}
        >
          <Plus size={18} className="mr-1.5" /> New Category
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Card key={i} className="bg-card/40 backdrop-blur-sm border-border/50 shadow-sm">
              <CardContent className="p-6 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : categories && categories.length > 0 ? (
          categories.map((cat) => (
            <Card key={cat.id} className="bg-card/40 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow group">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex shrink-0 items-center justify-center bg-background border border-border/50 shadow-sm transition-transform group-hover:scale-105" style={{ color: cat.color }}>
                  <Tags size={18} />
                </div>
                <div>
                  <p className="font-medium text-lg text-foreground/90 leading-tight">{cat.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5 opacity-80">{cat.type}</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full p-12 text-center text-muted-foreground bg-card/40 rounded-2xl border border-border/50">
            <p className="text-lg font-serif">No categories yet.</p>
            <p className="text-sm mt-1">Create one to start organizing your transactions.</p>
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl bg-background/95 backdrop-blur-md border-border/50">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-medium tracking-tight">New Category</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Define a new bucket for your entries.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Groceries" className="bg-card/50 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel className="text-muted-foreground">Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-2"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0 flex-1 border border-border/50 p-2.5 rounded-xl has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:border-primary/20 transition-all">
                          <FormControl><RadioGroupItem value="expense" className="text-primary" /></FormControl>
                          <FormLabel className="font-normal w-full cursor-pointer text-sm">Expense</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0 flex-1 border border-border/50 p-2.5 rounded-xl has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:border-primary/20 transition-all">
                          <FormControl><RadioGroupItem value="income" className="text-primary" /></FormControl>
                          <FormLabel className="font-normal w-full cursor-pointer text-sm">Income</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0 flex-1 border border-border/50 p-2.5 rounded-xl has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:border-primary/20 transition-all">
                          <FormControl><RadioGroupItem value="both" className="text-primary" /></FormControl>
                          <FormLabel className="font-normal w-full cursor-pointer text-sm">Both</FormLabel>
                        </FormItem>
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
                    <FormLabel className="text-muted-foreground">Color Theme</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-5 gap-2.5">
                        {PRESET_COLORS.map(color => (
                          <div 
                            key={color} 
                            onClick={() => field.onChange(color)}
                            className={`w-full aspect-square rounded-full cursor-pointer transition-transform ${field.value === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-110'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => setIsFormOpen(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} className="rounded-xl px-6">
                  {createMutation.isPending ? "Saving..." : "Create Category"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
