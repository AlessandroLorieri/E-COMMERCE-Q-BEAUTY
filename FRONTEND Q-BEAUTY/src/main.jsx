import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from "react-helmet-async";

import HomePage from './Home';        // <-- se il file è HomePage.jsx, usa: './HomePage'
import ScrollToTop from './components/ScrollToTop';
import CookieBanner from './components/CookieBanner';
import PrivacyPolicy from './PrivacyPolicy';

import HomeShop from './shop/HomeShop'
import ShopLayout from './shop/ShopLayout';
import CartShop from './shop/pages/CartShop';
import LoginShop from './shop/pages/LoginShop';
import { ShopProvider } from './shop/context/ShopContext';
import ProductDetailShop from './shop/pages/ProductDetailShop';
import CheckoutShop from "./shop/pages/CheckoutShop";
import { AuthProvider } from './shop/context/AuthContext';
import RegisterShop from "./shop/pages/RegisterShop";
import OrderSuccessShop from "./shop/pages/OrderSuccessShop";
import OrdersShop from "./shop/pages/OrdersShopUser";

import RequireAdmin from "./admin/RequireAdmin";
import AdminLayout from "./admin/AdminLayout";
import AdminHome from "./admin/pages/AdminHome";
import AdminProducts from "./admin/pages/AdminProducts";
import AdminOrders from "./admin/pages/AdminOrders";

import ForgotPasswordShop from "./shop/pages/ForgotPasswordShop";
import ResetPasswordShop from "./shop/pages/ResetPasswordShop";

import AdminCoupons from "./admin/pages/AdminCoupons";
import AdminReviews from "./admin/pages/AdminReviews";
import AdminShipping from "./admin/pages/AdminShipping";

import NotFoundPage from './NotFoundPage';

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";


import './App.css';
import './index.css';
import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <ScrollToTop />
        <CookieBanner />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />

          {/* redirect per chi arriva su /Home (maiuscolo) */}
          <Route path="/Home" element={<Navigate to="/" replace />} />

          <Route
            path="/shop"
            element={
              <AuthProvider>
                <ShopProvider>
                  <ShopLayout />
                </ShopProvider>
              </AuthProvider>
            }
          >
            <Route index element={<HomeShop />} />
            <Route path="cart" element={<CartShop />} />
            <Route path="login" element={<LoginShop />} />
            <Route path="forgot-password" element={<ForgotPasswordShop />} />
            <Route path="reset-password" element={<ResetPasswordShop />} />
            <Route path="register" element={<RegisterShop />} />
            <Route path="product/:id" element={<ProductDetailShop />} />
            <Route path="checkout" element={<CheckoutShop />} />
            <Route path="order-success/:id" element={<OrderSuccessShop />} />
            <Route path="orders" element={<OrdersShop />} />
          </Route>


          <Route
            path="/admin"
            element={
              <AuthProvider>
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              </AuthProvider>
            }
          >
            <Route index element={<AdminHome />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="shipping" element={<AdminShipping />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="reviews" element={<AdminReviews />} />

          </Route>


          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* catch-all: qualunque altra rotta → home */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
