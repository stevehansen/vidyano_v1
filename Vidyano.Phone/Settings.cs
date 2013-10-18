using System;
using System.ComponentModel;

namespace Vidyano
{
    public class Settings
    {
        public enum StartupPageTypeEnum
        {
            HomePage,
            PersistenObjectPage,
            QueryPage
        }

        public Settings()
        {
            if (!DesignerProperties.IsInDesignTool && Current != null)
                throw new Exception("Only one instance of Settings can be active.");

            Current = this;
        }

        public static Settings Current { get; private set; }

        public string AppName { get; set; }

        public StartupPageTypeEnum StartupPageType { get; set; }

        public string StartupPageArgument { get; set; }

        public string DefaultProgramUnitItemGroupNameKey { get; set; }

        public LayoutMode HomePageLayoutMode { get; set; }
    }
}