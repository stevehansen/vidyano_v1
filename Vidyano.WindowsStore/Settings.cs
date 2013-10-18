using System;
using System.Collections.Generic;
using Vidyano.Common;
using Windows.ApplicationModel;

namespace Vidyano
{
    public class Settings : NotifyableBase
    {
        private static Settings _Current;
        private string _AppName, _ProgramUnitItemImage, _CompanyLogo, _StartupPageArgument;
        private readonly List<SettingsFlyout> _Flyouts;
        private NormalActionsAlignmentEnum _NormalActionsAlignment = NormalActionsAlignmentEnum.Right;
        private StartupPageTypeEnum _StartupPageType = StartupPageTypeEnum.HomePage;

        public Settings()
        {
            if (!DesignMode.DesignModeEnabled && _Current != null)
                throw new Exception("Only one instance of Settings can be active.");

            _Current = this;
            _Flyouts = new List<SettingsFlyout>();
        }

        public string AppName { get { return _AppName; } set { SetProperty(ref _AppName, value); } }

        public string ProgramUnitItemImage { get { return _ProgramUnitItemImage; } set { SetProperty(ref _ProgramUnitItemImage, value); } }

        public string CompanyLogo { get { return _CompanyLogo; } set { SetProperty(ref _CompanyLogo, value); } }

        public NormalActionsAlignmentEnum NormalActionsAlignment { get { return _NormalActionsAlignment; } set { SetProperty(ref _NormalActionsAlignment, value); } }

        public StartupPageTypeEnum StartupPageType { get { return _StartupPageType; } set { SetProperty(ref _StartupPageType, value); } }

        public string StartupPageArgument { get { return _StartupPageArgument; } set { SetProperty(ref _StartupPageArgument, value); } }

        public List<SettingsFlyout> Flyouts { get { return _Flyouts; } }

        public static Settings Current { get { return _Current; } }

        public string Version
        {
            get
            {
                return string.Format("{0}.{1}.{2}.{3}",
                    Package.Current.Id.Version.Major,
                    Package.Current.Id.Version.Minor,
                    Package.Current.Id.Version.Build,
                    Package.Current.Id.Version.Revision);
            }
        }

        public enum NormalActionsAlignmentEnum
        {
            Left,
            Right
        }

        public enum StartupPageTypeEnum
        {
            HomePage,
            PersistentObjectPage,
            QueryPage
        }
    }
}