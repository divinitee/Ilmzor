"""One-shot: insert the `payment` i18n block into uz/en/ru.

The three language blocks are parallel, so the insertion point is the same
anchor in each: the line that opens `studytips`. Occurrence order in the file
is uz, en, ru.
"""
import io
import sys

PATH = "src/i18n/translations.js"
ANCHOR = "    studytips: {"

BLOCKS = [
    # --- uz ---
    """    payment: {
      checking_title: "To'lovingiz tasdiqlanmoqda...",
      checking_sub: "Odatda bu bir necha soniya oladi. Sahifani yopmang.",
      success_title: "Tayyor!",
      success_sub: "{plan} rejangiz faollashtirildi.",
      locked_note: "Asoschi narxi {price} / {cycle} — obunangiz davom etgunicha o'zgarmaydi.",
      cycle_month: "oy", cycle_year: "yil",
      slow_title: "To'lov qabul qilindi",
      slow_sub: "Ruxsatingiz hali sozlanmoqda. Odatda bir daqiqa ichida tayyor bo'ladi.",
      retry: "Qayta tekshirish",
      go_home: "Bosh sahifaga",
      go_pricing: "Narxlarga qaytish",
      signed_out_title: "Tugatish uchun tizimga kiring",
      signed_out_sub: "To'lovingiz amalga oshdi. To'lov qilgan email bilan kiring va ruxsatingiz paydo bo'ladi.",
      login: "Kirish",
    },
""",
    # --- en ---
    """    payment: {
      checking_title: "Confirming your payment...",
      checking_sub: "This usually takes a few seconds. Don't close this page.",
      success_title: "You're in!",
      success_sub: "Your {plan} plan is active.",
      locked_note: "Founder price locked at {price} / {cycle} — for as long as you stay subscribed.",
      cycle_month: "month", cycle_year: "year",
      slow_title: "Payment received",
      slow_sub: "We're still setting up your access. It usually lands within a minute.",
      retry: "Check again",
      go_home: "Go to my dashboard",
      go_pricing: "Back to pricing",
      signed_out_title: "Log in to finish",
      signed_out_sub: "Your payment went through. Log in with the same email you paid with and your access will appear.",
      login: "Log in",
    },
""",
    # --- ru ---
    """    payment: {
      checking_title: "Подтверждаем ваш платёж...",
      checking_sub: "Обычно это занимает несколько секунд. Не закрывайте страницу.",
      success_title: "Готово!",
      success_sub: "Ваш план {plan} активирован.",
      locked_note: "Цена основателя зафиксирована: {price} / {cycle} — пока подписка активна.",
      cycle_month: "месяц", cycle_year: "год",
      slow_title: "Платёж получен",
      slow_sub: "Доступ ещё настраивается. Обычно это занимает до минуты.",
      retry: "Проверить снова",
      go_home: "В личный кабинет",
      go_pricing: "Назад к тарифам",
      signed_out_title: "Войдите, чтобы завершить",
      signed_out_sub: "Платёж прошёл. Войдите с тем же email, с которого платили, и доступ появится.",
      login: "Войти",
    },
""",
]

src = io.open(PATH, encoding="utf-8").read()

if "    payment: {" in src:
    sys.exit("payment block already present — refusing to insert a second time")

n = src.count(ANCHOR)
if n != len(BLOCKS):
    sys.exit("expected %d anchors, found %d" % (len(BLOCKS), n))

out = []
rest = src
for block in BLOCKS:
    head, rest = rest.split(ANCHOR, 1)
    out.append(head)
    out.append(block)
    out.append(ANCHOR)
out.append(rest)

io.open(PATH, "w", encoding="utf-8").write("".join(out))
print("inserted payment block into all %d language dictionaries" % len(BLOCKS))
