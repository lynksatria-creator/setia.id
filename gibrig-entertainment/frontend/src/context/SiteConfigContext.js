import React, { createContext, useContext, useEffect, useState } from 'react';
import { initialSiteConfig } from '../mock/mock';

const SiteConfigContext = createContext(null);

const STORAGE_KEY = 'gibrig_site_config_v1';

export const SiteConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load site config from storage', e);
    }
    return initialSiteConfig;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Could not save site config', e);
    }
  }, [config]);

  const updateConfig = (partial) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const updateBrand = (partial) => {
    setConfig((prev) => ({ ...prev, brand: { ...prev.brand, ...partial } }));
  };

  const updateSocial = (partial) => {
    setConfig((prev) => ({ ...prev, social: { ...prev.social, ...partial } }));
  };

  const updateFooter = (partial) => {
    setConfig((prev) => ({ ...prev, footer: { ...prev.footer, ...partial } }));
  };

  const updatePackages = (packages) => {
    setConfig((prev) => ({ ...prev, packages }));
  };

  const updateGallery = (gallery) => {
    setConfig((prev) => ({ ...prev, gallery }));
  };

  const updateTestimonials = (testimonials) => {
    setConfig((prev) => ({ ...prev, testimonials }));
  };

  const updateArtist = (partial) => {
    setConfig((prev) => ({
      ...prev,
      artist: { ...(prev.artist || {}), ...partial },
    }));
  };


  return (
    <SiteConfigContext.Provider
      value={{
        config,
        updateConfig,
        updateBrand,
        updateSocial,
        updateArtist,
        updateFooter,
        updatePackages,
        updateGallery,
        updateTestimonials,
        setConfig,
      }}

    >
      {children}
    </SiteConfigContext.Provider>
  );
};

export const useSiteConfig = () => {
  const ctx = useContext(SiteConfigContext);
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider');
  return ctx;
};

