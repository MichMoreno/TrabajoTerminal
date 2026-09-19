// frontend/src/components/common/AnimatedTabs.jsx
import { motion } from 'motion/react';

const AnimatedTabs = ({ tabs, activeTab, onTabChange, children }) => {
  return (
    <>
      <div className="config-tabs-list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.value}
            className={`config-tab ${activeTab === tab.value ? 'active' : ''}`}
            onClick={() => onTabChange(tab.value)}
          >
            {tab.label}
            {activeTab === tab.value && (
              <motion.span
                layoutId="active-tab-indicator"
                className="config-tab-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="config-tab-content">{children}</div>
    </>
  );
};

export default AnimatedTabs;