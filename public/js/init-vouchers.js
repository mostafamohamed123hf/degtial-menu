<<<<<<< HEAD
// Initialize sample vouchers for development
document.addEventListener("DOMContentLoaded", function () {
  // Sample vouchers data
  const sampleVouchers = [
    {
      id: "voucher1",
      code: "WELCOME10",
      discount: 10,
      type: "percentage",
      description: "10% off your first order",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      minOrderAmount: 50,
    },
    {
      id: "voucher2",
      code: "SAVE20",
      discount: 20,
      type: "percentage",
      description: "20% off orders above 100",
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      minOrderAmount: 100,
    },
    {
      id: "voucher3",
      code: "FLAT50",
      discount: 50,
      type: "fixed",
      description: "50 off your order",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      minOrderAmount: 200,
    },
  ];

  // Store vouchers in localStorage if not already present
  if (!localStorage.getItem("vouchers")) {
    localStorage.setItem("vouchers", JSON.stringify(sampleVouchers));
    console.log("Sample vouchers initialized");
  }
});
=======
// Initialize sample vouchers for development
document.addEventListener("DOMContentLoaded", function () {
  // Sample vouchers data
  const sampleVouchers = [
    {
      id: "voucher1",
      code: "WELCOME10",
      discount: 10,
      type: "percentage",
      description: "10% off your first order",
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      minOrderAmount: 50,
    },
    {
      id: "voucher2",
      code: "SAVE20",
      discount: 20,
      type: "percentage",
      description: "20% off orders above 100",
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      minOrderAmount: 100,
    },
    {
      id: "voucher3",
      code: "FLAT50",
      discount: 50,
      type: "fixed",
      description: "50 off your order",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      minOrderAmount: 200,
    },
  ];

  // Store vouchers in localStorage if not already present
  if (!localStorage.getItem("vouchers")) {
    localStorage.setItem("vouchers", JSON.stringify(sampleVouchers));
    console.log("Sample vouchers initialized");
  }
});
>>>>>>> e17e82634e94e59ba130b332d7929f60eb408654
