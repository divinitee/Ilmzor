import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, ArrowLeft, MessageCircle } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-slate-950 dark:to-indigo-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </Link>

        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4">
          <MessageCircle className="w-7 h-7 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-4">Biz bilan bog'laning</h1>
        <p className="text-muted-foreground mb-8">
          Savollaringiz, takliflaringiz yoki texnik yordam kerak bo'lsa, quyidagi manzil orqali biz bilan
          bog'lanishingiz mumkin.
        </p>

        <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <a href="mailto:ilmzor.uz@gmail.com" className="text-base font-semibold text-foreground hover:text-primary">
              ilmzor.uz@gmail.com
            </a>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 mt-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Telefon</p>
            <a href="tel:+998939338845" className="text-base font-semibold text-foreground hover:text-primary">
              +998 93 933 88 45
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}