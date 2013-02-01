using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.Common;
using Vidyano.ViewModel;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Vidyano.View.Common;
using Windows.UI.Xaml.Input;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeDateTimeOffset: PersistentObjectAttributeControlBase
    {
        public static readonly DependencyProperty DateComponentsProperty = DependencyProperty.Register("DateComponents", typeof(Component[]), typeof(PersistentObjectAttributeDateTimeOffset), new PropertyMetadata(null));
        public static readonly DependencyProperty TimeComponentsProperty = DependencyProperty.Register("TimeComponents", typeof(Component[]), typeof(PersistentObjectAttributeDateTimeOffset), new PropertyMetadata(null));
        public static readonly DependencyProperty OffsetComponentProperty = DependencyProperty.Register("OffsetComponent", typeof(Component), typeof(PersistentObjectAttributeDateTimeOffset), new PropertyMetadata(null));

        private static Component.Item[] monthNames = Enumerable.Range(1, 12).Select(i => new Component.Item(i, CultureInfo.CurrentUICulture.DateTimeFormat.GetMonthName(i))).ToArray();
        private static Component.Item[] offsets = new[] { "-13:00", "-12:00", "-11:00", "-10:00", "-09:00", "-08:00", "-07:00", "-06:00", "-05:00", "-04:30", "-04:00", "-03:30", "-03:00", "-02:00", "-01:00", "+00:00", "+01:00", "+02:00", "+03:00", "+03:30", "+04:00", "+04:30", "+05:00", "+05:30", "+05:45", "+06:00", "+06:30", "+07:00", "+08:00", "+09:00", "+09:30", "+10:00", "+11:00", "+12:00", "+13:00", "+14:00" }.Select(t => new Component.Item((int)TimeSpan.Parse(t.TrimStart('+')).TotalMinutes, t)).ToArray();

        private Component day, month, year, hours, minutes, ampm;
        private bool skipSync;
        private Popup popup;

        public PersistentObjectAttributeDateTimeOffset()
        {
            this.DefaultStyleKey = typeof(PersistentObjectAttributeDateTimeOffset);

            IsTabStop = true;
        }

        protected override void OnApplyTemplate()
        {
            base.OnApplyTemplate();

            var deleteButton = this.GetTemplateChild("DeleteButton") as Button;
            if (deleteButton != null)
                deleteButton.Tapped += DeleteButton_Tapped;

            if (DateComponents != null)
            {
                var monthColumn = this.GetTemplateChild("PART_DateColumn" + Array.IndexOf(DateComponents, month)) as ColumnDefinition;
                if (monthColumn != null)
                    monthColumn.Width = new GridLength(1, GridUnitType.Star);
            }

            popup = this.GetTemplateChild("Popup") as Popup;
            if (popup != null)
                popup.Closed += (_, __) => Focus(Windows.UI.Xaml.FocusState.Programmatic);

            VisualStateManager.GoToState(this, "Normal", false);
            VisualStateManager.GoToState(this, "NoDate", true);
            VisualStateManager.GoToState(this, "NoTime", true);
            VisualStateManager.GoToState(this, "NoOffset", true);
            VisualStateManager.GoToState(this, "NoAMPM", true);
        }

        private void Initialize()
        {
            try
            {
                skipSync = true;

                DateTime? date = null;
                TimeSpan? time = null;
                DateTimeOffset? offset = null;

                if (Attribute.ClrType == typeof(DateTime))
                    date = new DateTime?((DateTime)Attribute.Value);
                else if (Attribute.ClrType == typeof(DateTime?))
                    date = (DateTime?)Attribute.Value;
                else if (Attribute.ClrType == typeof(TimeSpan))
                    time = new TimeSpan?((TimeSpan)Attribute.Value);
                else if (Attribute.ClrType == typeof(TimeSpan?))
                    time = (TimeSpan?)Attribute.Value;
                else if (Attribute.ClrType == typeof(DateTimeOffset))
                    offset = new DateTimeOffset?((DateTimeOffset)Attribute.Value);
                else if (Attribute.ClrType == typeof(DateTimeOffset?))
                    offset = (DateTimeOffset?)Attribute.Value;

                var isDate = Attribute.Type.Contains("Date");
                VisualStateManager.GoToState(this, isDate ? "Date" : "NoDate", true);
                if (isDate)
                {
                    var dateComponents = new List<Component>();

                    CultureInfo.CurrentUICulture.DateTimeFormat.ShortDatePattern.ToLower().Split(new[] { DateTime.Now.ToString("%/", CultureInfo.CurrentUICulture.DateTimeFormat) }, StringSplitOptions.None).Run(p =>
                    {
                        Component c;
                        if (p.Contains("d"))
                            c = day = new Component(SyncDate);
                        else if (p.Contains("m"))
                            c = month = new Component(SyncDate);
                        else
                            c = year = new Component(SyncDate);

                        dateComponents.Add(c);
                    });

                    if (!Attribute.IsRequired)
                    {
                        day.Items.Add(Component.Item.None);
                        month.Items.Add(Component.Item.None);
                        year.Items.Add(Component.Item.None);
                    }

                    Enumerable.Range(1, 31).Select(i => new Component.Item(i, i.ToString())).Run(day.Items.Add);
                    monthNames.Run(month.Items.Add);
                    Enumerable.Range(1900, 200).Select(i => new Component.Item(i, i.ToString())).Run(year.Items.Add);

                    var yearValue = date.HasValue ? date.Value.Year : offset.HasValue ? offset.Value.Year : -1;
                    var monthValue = date.HasValue ? date.Value.Month : offset.HasValue ? offset.Value.Month : -1;
                    var dayValue = date.HasValue ? date.Value.Day : offset.HasValue ? offset.Value.Day : -1;

                    year.SelectedItem = yearValue != -1 ? year.Items.First(y => y.Key == yearValue) : null;
                    month.SelectedItem = monthValue != -1 ? monthNames.First(m => m.Key == monthValue) : null;
                    day.SelectedItem = dayValue != -1 ? day.Items.First(d => d.Key == dayValue) : null;

                    DateComponents = dateComponents.ToArray();
                }
                else
                    DateComponents = null;

                var isTime = Attribute.Type.Contains("Time");
                VisualStateManager.GoToState(this, isTime ? "Time" : "NoTime", true);
                if (isTime)
                {
                    var timeComponents = new List<Component>();

                    hours = new Component(SyncDate);
                    timeComponents.Add(hours);

                    minutes = new Component(SyncDate);
                    timeComponents.Add(minutes);

                    if (!Attribute.IsRequired)
                    {
                        hours.Items.Add(Component.Item.None);
                        minutes.Items.Add(Component.Item.None);
                    }

                    var selectHour = date.HasValue ? date.Value.Hour : time.HasValue ? time.Value.Hours : (offset.HasValue ? offset.Value.Hour : -1);
                    var selectMinutes = date.HasValue ? date.Value.Minute : time.HasValue ? time.Value.Minutes : (offset.HasValue ? offset.Value.Minute : -1);

                    var isAmPm = !string.IsNullOrEmpty(CultureInfo.CurrentUICulture.DateTimeFormat.AMDesignator);
                    VisualStateManager.GoToState(this, isAmPm ? "AMPM" : "NoAMPM", true);
                    if (isAmPm)
                    {
                        ampm = new Component(SyncDate);
                        if (!Attribute.IsRequired)
                            ampm.Items.Add(Component.Item.None);

                        var am = new Component.Item(0, CultureInfo.CurrentUICulture.DateTimeFormat.AMDesignator);
                        ampm.Items.Add(am);
                        var pm = new Component.Item(1, CultureInfo.CurrentUICulture.DateTimeFormat.PMDesignator);
                        ampm.Items.Add(pm);

                        timeComponents.Add(ampm);
                        ampm.SelectedItem = selectHour != -1 ? (selectHour < 12 ? am : pm) : null;
                    }

                    Enumerable.Range(0, ampm != null ? 12 : 24).Run(h => hours.Items.Add(new Component.Item(h, ampm != null && h == 0 ? "12" : h.ToString())));
                    Enumerable.Range(0, 60).Run(m => minutes.Items.Add(new Component.Item(m, m.ToString("00"))));

                    hours.SelectedItem = selectHour != -1 ? hours.Items.First(h => ampm != null ? h.Key == selectHour % 12 : h.Key == selectHour) : null;
                    minutes.SelectedItem = selectMinutes != -1 ? minutes.Items.First(m => m.Key == selectMinutes) : null;

                    TimeComponents = timeComponents.ToArray();
                }
                else
                    TimeComponents = null;

                var isOffset = Attribute.Type.Contains("Offset");
                VisualStateManager.GoToState(this, isOffset ? "Offset" : "NoOffset", true);
                if (isOffset)
                {
                    OffsetComponent = new Component(SyncDate);
                    if (!Attribute.IsRequired)
                        OffsetComponent.Items.Add(Component.Item.None);

                    offsets.Run(OffsetComponent.Items.Add);
                    OffsetComponent.SelectedItem = offset.HasValue ? OffsetComponent.Items.First(o => o.Key == offset.Value.Offset.TotalMinutes) : null;
                }
                else
                    OffsetComponent = null;
            }
            finally
            {
                skipSync = false;
            }
        }

        private void SyncDate()
        {
            if (skipSync)
                return;

            try
            {
                skipSync = true;

                DateTime? date = null;
                TimeSpan? offset = null;
                bool? hasDate = null, hasTime = null, hasOffset = null;

                if (Attribute.Type.Contains("Date"))
                {
                    hasDate = true;
                    if (year.SelectedItem != Component.Item.None && year.SelectedItem != null && month.SelectedItem != Component.Item.None && month.SelectedItem != null && day.SelectedItem != Component.Item.None && day.SelectedItem != null)
                    {
                        var y = year.SelectedItem.Key;
                        var m = month.SelectedItem.Key;
                        var d = day.SelectedItem.Key;

                        var maxDays = DateTime.DaysInMonth(y, m);

                        while (day.Items.Count - (Attribute.IsRequired ? 0 : 1) > maxDays)
                            day.Items.RemoveAt(day.Items.Count - 1);

                        for (int i = day.Items.Count - (Attribute.IsRequired ? 0 : 1); i < maxDays; i++)
                            day.Items.Add(new Component.Item(i + 1, (i + 1).ToString()));

                        if (d > maxDays)
                        {
                            day.SelectedItem = day.Items.Last();
                            d = day.SelectedItem.Key;
                        }

                        date = new DateTime(y, m, d);
                    }
                    else
                        hasDate = false;
                }

                if (Attribute.Type.Contains("Time"))
                {
                    hasTime = true;
                    
                    var isAmPm = !string.IsNullOrEmpty(CultureInfo.CurrentUICulture.DateTimeFormat.AMDesignator);
                    if (hours.SelectedItem != Component.Item.None && hours.SelectedItem != null && minutes.SelectedItem != Component.Item.None && minutes.SelectedItem != null && (!isAmPm || (ampm.SelectedItem != null && ampm.SelectedItem != Component.Item.None)))
                    {
                        var hrs = hours.SelectedItem.Key;
                        if (isAmPm && ampm.SelectedItem.Key == 1)
                            hrs += 12;

                        var mins = minutes.SelectedItem.Key;

                        date = date.GetValueOrDefault().AddHours(hrs).AddMinutes(mins);
                    }
                    else
                        hasTime = false;
                }

                if (Attribute.Type.Contains("Offset"))
                {
                    hasOffset = true;
                    if (OffsetComponent.SelectedItem != Component.Item.None && OffsetComponent.SelectedItem != null)
                        offset = TimeSpan.FromMinutes(OffsetComponent.SelectedItem.Key);
                    else
                        hasOffset = false;
                }

                if (Attribute.ClrType == typeof(DateTime) && hasDate == true && hasTime != false)
                    Attribute.Value = date;
                else if (Attribute.ClrType == typeof(DateTime?))
                    Attribute.Value = hasDate == true && hasTime != false ? date : (DateTime?)null;
                else if (Attribute.ClrType == typeof(TimeSpan) && hasTime == true)
                    Attribute.Value = date.Value.TimeOfDay;
                else if (Attribute.ClrType == typeof(TimeSpan?))
                    Attribute.Value = hasTime == true ? date.Value.TimeOfDay : (TimeSpan?)null;
                else if (Attribute.ClrType == typeof(DateTimeOffset) && hasDate == true && hasTime == true && hasOffset == true)
                    Attribute.Value = new DateTimeOffset(date.Value, offset.Value);
                else if (Attribute.ClrType == typeof(DateTimeOffset?))
                    Attribute.Value = (hasDate == true && hasTime == true && hasOffset == true) ? new DateTimeOffset(date.Value, offset.Value) : (DateTimeOffset?)null;

                VisualStateManager.GoToState(this, !Attribute.IsRequired && Attribute.Value != null ? "ButtonVisible" : "ButtonCollapsed", false);
            }
            finally
            {
                skipSync = false;
            }
        }

        private void DeleteButton_Tapped(object sender, TappedRoutedEventArgs e)
        {
            if (!Attribute.IsRequired)
            {
                Attribute.Value = null;
                
                if(popup != null)
                    popup.IsOpen = false;

                e.Handled = true;
                Focus(Windows.UI.Xaml.FocusState.Programmatic);
            }
        }

        protected override void OnTapped(TappedRoutedEventArgs e)
        {
            Initialize();

            if(popup != null)
                popup.IsOpen = true;

            base.OnTapped(e);
        }

        protected override void OnIsRequiredOrValueChanged(bool newValue)
        {
            VisualStateManager.GoToState(this, Attribute != null && !Attribute.IsRequired && Attribute.Value != null ? "ButtonVisible" : "ButtonCollapsed", false);
        }

        public Component[] DateComponents
        {
            get { return (Component[])GetValue(DateComponentsProperty); }
            set { SetValue(DateComponentsProperty, value); }
        }

        public Component[] TimeComponents
        {
            get { return (Component[])GetValue(TimeComponentsProperty); }
            set { SetValue(TimeComponentsProperty, value); }
        }

        public Component OffsetComponent
        {
            get { return (Component)GetValue(OffsetComponentProperty); }
            set { SetValue(OffsetComponentProperty, value); }
        }

        public class Component : NotifyableBase
        {
            private Item _SelectedItem;
            private Action onChanged;

            internal Component(Action onChanged)
            {
                this.onChanged = onChanged;
                Items = new ObservableCollection<Item>();
            }

            public ObservableCollection<Item> Items { get; private set; }

            public Item SelectedItem
            {
                get
                {
                    return _SelectedItem;
                }
                set
                {
                    if (value == null)
                        return;

                    if (SetProperty(ref _SelectedItem, value))
                        onChanged();

                    OnPropertyChanged();
                }
            }

            public class Item : NotifyableBase
            {
                public static Item None = new Item();

                Item()
                {
                }

                internal Item(int key, string value)
                {
                    Key = key;
                    Value = value;
                }

                public int Key { get; private set; }
                public string Value { get; private set; }
            }
        }
    }
}