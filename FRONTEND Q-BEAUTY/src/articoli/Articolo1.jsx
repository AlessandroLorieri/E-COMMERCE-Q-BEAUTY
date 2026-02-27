import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import '../App.css';

function Articolo1() {
  const { t } = useTranslation();

  return (
    <div className="product-page">
      <h1 className="gold">{t('article1_title')}</h1>
      <p>{t('article1_paragraph')}</p>
      <Link to="/" className="insta-btn">{t('back_home')}</Link>
    </div>
  );
}

export default Articolo1;
