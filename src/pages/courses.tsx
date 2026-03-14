import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Briefcase, Layers, ArrowRight } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { useCourses, useEnrollInCourse } from "@/hooks/use-app-data";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Courses() {
  const { data: courses, isLoading } = useCourses();
  const enrollMutation = useEnrollInCourse();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; title: string; fee: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleEnroll = (courseId: string) => {
    enrollMutation.mutate(courseId, {
      onSuccess: () => {
        toast({ title: "Enrolled!", description: "You can now access the course." });
        setSelectedCourse(null);
        setLocation(`/courses/${courseId}`);
      },
      onError: (err) => {
        toast({
          title: "Enrollment failed",
          description: err instanceof Error ? err.message : "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const openPaymentDialog = (course: { id: string; title: string; fee: number }) => {
    setSelectedCourse(course);
    setPaymentMethod("mpesa");
    setMpesaPhone("");
    setCardNumber("");
    setCardExpiry("");
    setCardCvv("");
    setIsProcessingPayment(false);
  };

  const closePaymentDialog = () => {
    if (isProcessingPayment || enrollMutation.isPending) return;
    setSelectedCourse(null);
  };

  const handleConfirmPayment = () => {
    if (!selectedCourse) return;
    setIsProcessingPayment(true);

    // Simulate a short processing delay for the chosen payment method
    setTimeout(() => {
      setIsProcessingPayment(false);

      const methodLabel = paymentMethod === "mpesa" ? "Lipa Na M-Pesa" : "Card";
      toast({
        title: "Payment simulated",
        description: `Successfully simulated ${methodLabel} payment for ${selectedCourse.title}.`,
      });

      handleEnroll(selectedCourse.id);
    }, 1200);
  };

  const filteredCourses = courses?.filter(c => {
    if (filter !== "All" && c.category !== filter) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <MainLayout>
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-2 border-border pb-6">
          <div>
            <h1 className="text-4xl font-display font-bold text-foreground tracking-tight underline decoration-primary decoration-4 underline-offset-8">Course Catalog</h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg font-medium">
              Learn by doing. Browse our collection of real-world ticket simulations designed by industry experts.
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-background p-3 rounded-none border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
          <Tabs defaultValue="All" value={filter} onValueChange={setFilter} className="w-full sm:w-auto overflow-x-auto">
            <TabsList className="bg-transparent border-0 h-10 p-0 gap-2 w-max">
              {["All", "Tech", "Business", "Design", "Finance"].map(tab => (
                <TabsTrigger 
                  key={tab} 
                  value={tab}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-transparent rounded-none px-4 text-sm font-bold transition-none border-2 border-border text-foreground hover:bg-secondary h-full"
                >
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Search courses..." 
              className="pl-10 bg-background border-2 border-border text-foreground font-medium focus-visible:ring-0 focus-visible:border-primary rounded-none h-10 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Course Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-64 w-full rounded-none bg-secondary border-2 border-border" />)}
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.05 }}
          >
            {filteredCourses?.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="h-full"
              >
                <Card className="h-full flex flex-col border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] transition-all overflow-hidden bg-background rounded-none">
                  <CardHeader className="p-6 pb-4 bg-secondary border-b-2 border-border">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="secondary" className="bg-background text-foreground hover:bg-background border-2 border-border font-bold rounded-none px-3 py-1">
                        {course.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-bold border-2 border-border text-foreground bg-background rounded-none px-2 py-1">
                        {course.difficulty}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl font-display font-bold leading-tight line-clamp-2 text-foreground">{course.title}</CardTitle>
                    <p className="text-sm font-bold text-muted-foreground mt-2 uppercase tracking-wide">by {course.instructor}</p>
                  </CardHeader>
                  
                  <CardContent className="p-6 pt-4 flex-1">
                    <div className="flex items-center gap-4 text-sm text-foreground font-bold">
                      <div className="flex items-center gap-2 bg-secondary px-3 py-2 border-2 border-border">
                        <Layers className="w-5 h-5 text-primary" />
                        <span>{course.totalSprints} Sprints</span>
                      </div>
                      <div className="flex items-center gap-2 bg-secondary px-3 py-2 border-2 border-border">
                        <Briefcase className="w-5 h-5 text-purple-400" />
                        <span>{course.totalTickets} Tickets</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="p-6 pt-0 flex flex-col sm:flex-row items-start sm:items-center justify-between mt-auto gap-4">
                    <div className="font-bold text-foreground text-xl">
                      KES {course.fee.toLocaleString()}
                    </div>
                    {course.isEnrolled ? (
                      <Button asChild size="default" variant="default" className="w-full sm:w-auto font-bold bg-primary text-primary-foreground hover:bg-primary/90 border-b-4 border-primary/50 translate-y-[-2px] hover:translate-y-[0px] hover:border-b-0 transition-all rounded-none px-6">
                        <Link href={`/courses/${course.id}`}>Continue</Link>
                      </Button>
                    ) : (
                      <Button
                        size="default"
                        variant="outline"
                        className="w-full sm:w-auto font-bold bg-secondary text-foreground hover:bg-background border-2 border-border rounded-none px-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                        onClick={() => openPaymentDialog(course)}
                        disabled={enrollMutation.isPending && enrollMutation.variables === course.id}
                      >
                        {enrollMutation.isPending && enrollMutation.variables === course.id ? "Enrolling…" : "Enroll Now"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {filteredCourses?.length === 0 && (
          <div className="text-center py-20 bg-background rounded-none border-2 border-border border-dashed">
            <h3 className="text-2xl font-bold text-foreground mb-4 font-display">No courses found</h3>
            <p className="text-muted-foreground font-medium text-lg">Try adjusting your search or filters.</p>
          </div>
        )}

        <Dialog open={!!selectedCourse} onOpenChange={(open) => (open ? undefined : closePaymentDialog())}>
          <DialogContent className="rounded-none border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,0.7)]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-bold uppercase tracking-wider">
                Make Payment
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Choose how to pay for{" "}
                <span className="font-semibold text-foreground">
                  {selectedCourse?.title ?? "this course"}
                </span>
                . This is a sandbox simulation only — no real money is moved.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between bg-secondary px-4 py-3 border-2 border-border">
                <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Total Fee
                </span>
                <span className="text-xl font-display font-bold">
                  KES {selectedCourse?.fee.toLocaleString()}
                </span>
              </div>

              <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "mpesa" | "card")}>
                <TabsList className="bg-transparent border-0 h-10 p-0 gap-2 w-full">
                  <TabsTrigger
                    value="mpesa"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-transparent rounded-none px-4 text-sm font-bold transition-none border-2 border-border text-foreground hover:bg-secondary h-full flex-1"
                  >
                    Lipa Na M-Pesa
                  </TabsTrigger>
                  <TabsTrigger
                    value="card"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-transparent rounded-none px-4 text-sm font-bold transition-none border-2 border-border text-foreground hover:bg-secondary h-full flex-1"
                  >
                    Card Payment
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="mpesa" className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    Enter a Kenyan mobile number to simulate an STK push request. We&apos;ll pretend you
                    approved it on your phone.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="mpesa-phone" className="text-xs font-bold uppercase tracking-wider">
                      M-Pesa phone number
                    </Label>
                    <Input
                      id="mpesa-phone"
                      placeholder="e.g. 07xx xxx xxx"
                      className="rounded-none border-2 border-border"
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="card" className="mt-4 space-y-3">
                  <p className="text-xs text-muted-foreground font-medium">
                    Use any dummy card details below to walk through a typical card checkout flow.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="card-number" className="text-xs font-bold uppercase tracking-wider">
                      Card number
                    </Label>
                    <Input
                      id="card-number"
                      placeholder="4242 4242 4242 4242"
                      className="rounded-none border-2 border-border"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="card-expiry" className="text-xs font-bold uppercase tracking-wider">
                        Expiry
                      </Label>
                      <Input
                        id="card-expiry"
                        placeholder="MM / YY"
                        className="rounded-none border-2 border-border"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card-cvv" className="text-xs font-bold uppercase tracking-wider">
                        CVV
                      </Label>
                      <Input
                        id="card-cvv"
                        placeholder="123"
                        className="rounded-none border-2 border-border"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter className="mt-6">
              <Button
                variant="outline"
                className="rounded-none border-2 border-border bg-background text-foreground font-bold px-4"
                onClick={closePaymentDialog}
                disabled={isProcessingPayment || enrollMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                className="rounded-none bg-primary text-primary-foreground font-bold px-6 border-2 border-transparent hover:border-foreground"
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment || enrollMutation.isPending}
              >
                {isProcessingPayment || enrollMutation.isPending ? "Processing..." : "Pay & Enroll"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
