import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  useCreateTransaction, 
  useUpdateTransaction, 
  useGetTransaction,
  useGetCategories,
  getGetTransactionsQueryKey,
  getGetMonthlySummaryQueryKey,
  getGetCategorySummaryQueryKey,
  getGetMonthlyTrendsQueryKey,
  CreateTransactionInputType
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formSchema = z.object({
  type: z.enum(["income", "expense"] as const),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  categoryId: z.coerce.number().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function TransactionFormDialog({ 
  open, 
  onOpenChange, 
  transactionId,
  month
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  transactionId: number | null;
  month: string;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: transaction, isLoading: isLoadingTx } = useGetTransaction(
    transactionId || 0,
    { query: { enabled: !!transactionId && open } }
  );

  const { data: categories } = useGetCategories();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense",
      amount: 0,
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      categoryId: null,
    },
  });

  useEffect(() => {
    if (transaction && open) {
      form.reset({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.date.split('T')[0],
        categoryId: transaction.categoryId || null,
      });
    } else if (!transactionId && open) {
      form.reset({
        type: "expense",
        amount: 0,
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
        categoryId: null,
      });
    }
  }, [transaction, transactionId, open, form]);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const type = form.watch("type");
  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(c => c.type === type || c.type === 'both');
  }, [categories, type]);

  const onSubmit = (values: FormValues) => {
    const action = transactionId 
      ? updateMutation.mutateAsync({ id: transactionId, data: { ...values, type: values.type as CreateTransactionInputType } })
      : createMutation.mutateAsync({ data: { ...values, type: values.type as CreateTransactionInputType } });

    action.then(() => {
      queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMonthlySummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetCategorySummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMonthlyTrendsQueryKey() });
      
      toast({ description: transactionId ? "Entry updated gracefully." : "Entry added to your journal." });
      onOpenChange(false);
    }).catch(err => {
      toast({ variant: "destructive", description: err.message || "Failed to save entry." });
    });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl bg-background/95 backdrop-blur-md border-border/50">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-medium tracking-tight">
            {transactionId ? "Edit Entry" : "New Entry"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Record a new movement in your ledger.
          </DialogDescription>
        </DialogHeader>

        {isLoadingTx && transactionId ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("categoryId", null); // reset category when type changes
                        }}
                        defaultValue={field.value}
                        className="flex space-x-2"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0 flex-1 border border-border/50 p-3 rounded-xl has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:border-primary/20 transition-all">
                          <FormControl>
                            <RadioGroupItem value="expense" className="text-primary" />
                          </FormControl>
                          <FormLabel className="font-normal w-full cursor-pointer">Expense</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0 flex-1 border border-border/50 p-3 rounded-xl has-[[data-state=checked]]:bg-primary/5 has-[[data-state=checked]]:border-primary/20 transition-all">
                          <FormControl>
                            <RadioGroupItem value="income" className="text-primary" />
                          </FormControl>
                          <FormLabel className="font-normal w-full cursor-pointer">Income</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Amount</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                          <Input type="number" step="0.01" className="pl-7 bg-card/50 rounded-xl" {...field} value={field.value || ''} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground">Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="bg-card/50 rounded-xl block w-full" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Description</FormLabel>
                    <FormControl>
                      <Input placeholder="What was this for?" className="bg-card/50 rounded-xl" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-muted-foreground">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                      <FormControl>
                        <SelectTrigger className="bg-card/50 rounded-xl">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl">
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end gap-3">
                <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="rounded-xl">Cancel</Button>
                <Button type="submit" disabled={isPending} className="rounded-xl px-6">
                  {isPending ? "Saving..." : "Save Entry"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
