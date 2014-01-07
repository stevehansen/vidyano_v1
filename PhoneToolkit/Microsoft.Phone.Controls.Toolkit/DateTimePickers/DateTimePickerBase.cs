﻿// (c) Copyright Microsoft Corporation.
// This source is subject to the Microsoft Public License (Ms-PL).
// Please see http://go.microsoft.com/fwlink/?LinkID=131993 for details.
// All other rights reserved.

using System;
using System.ComponentModel;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Controls.Primitives;
using System.Windows.Navigation;
using Microsoft.Phone.Controls.Primitives;

namespace Microsoft.Phone.Controls
{
    /// <summary>
    /// Represents a base class for controls that allow the user to choose a date/time.
    /// </summary>
    [TemplatePart(Name = ButtonPartName, Type = typeof(ButtonBase))]
    public class DateTimePickerBase : Control
    {
        private const string ButtonPartName = "DateTimeButton";

        private ButtonBase _dateButtonPart;
        private PhoneApplicationFrame _frame;
        private object _frameContentWhenOpened;
        private NavigationInTransition _savedNavigationInTransition;
        private NavigationOutTransition _savedNavigationOutTransition;
        private IDateTimePickerPage _dateTimePickerPage;

        /// <summary>
        /// Event that is invoked when the Value property changes.
        /// </summary>
        public event EventHandler<DateTimeValueChangedEventArgs> ValueChanged;

        /// <summary>
        /// Gets or sets the DateTime value.
        /// </summary>
        [TypeConverter(typeof(TimeTypeConverter))]
        [SuppressMessage("Microsoft.Naming", "CA1721:PropertyNamesShouldNotMatchGetMethods", Justification = "Matching the use of Value as a Picker naming convention.")]
        public DateTime? Value
        {
            get { return (DateTime?)GetValue(ValueProperty); }
            set { SetValue(ValueProperty, value); }
        }

        /// <summary>
        /// Identifies the Value DependencyProperty.
        /// </summary>
        public static readonly DependencyProperty ValueProperty = DependencyProperty.Register(
            "Value", typeof(DateTime?), typeof(DateTimePickerBase), new PropertyMetadata(null, OnValueChanged));

        private static void OnValueChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
        {
            ((DateTimePickerBase)o).OnValueChanged((DateTime?)e.OldValue, (DateTime?)e.NewValue);
        }

        private void OnValueChanged(DateTime? oldValue, DateTime? newValue)
        {
            UpdateValueString();
            OnValueChanged(new DateTimeValueChangedEventArgs(oldValue, newValue));
        }

        /// <summary>
        /// Called when the value changes.
        /// </summary>
        /// <param name="e">The event data.</param>
        protected virtual void OnValueChanged(DateTimeValueChangedEventArgs e)
        {
            var handler = ValueChanged;
            if (null != handler)
            {
                handler(this, e);
            }
        }

        /// <summary>
        /// Gets the string representation of the selected value.
        /// </summary>
        public string ValueString
        {
            get { return (string)GetValue(ValueStringProperty); }
            private set { SetValue(ValueStringProperty, value); }
        }

        /// <summary>
        /// Identifies the ValueString DependencyProperty.
        /// </summary>
        public static readonly DependencyProperty ValueStringProperty = DependencyProperty.Register(
            "ValueString", typeof(string), typeof(DateTimePickerBase), null);

        /// <summary>
        /// Gets or sets the format string to use when converting the Value property to a string.
        /// </summary>
        public string ValueStringFormat
        {
            get { return (string)GetValue(ValueStringFormatProperty); }
            set { SetValue(ValueStringFormatProperty, value); }
        }

        /// <summary>
        /// Identifies the ValueStringFormat DependencyProperty.
        /// </summary>
        public static readonly DependencyProperty ValueStringFormatProperty = DependencyProperty.Register(
            "ValueStringFormat", typeof(string), typeof(DateTimePickerBase), new PropertyMetadata(null, OnValueStringFormatChanged));

        private static void OnValueStringFormatChanged(DependencyObject o, DependencyPropertyChangedEventArgs e)
        {
            ((DateTimePickerBase)o).OnValueStringFormatChanged(/*(string)e.OldValue, (string)e.NewValue*/);
        }

        private void OnValueStringFormatChanged(/*string oldValue, string newValue*/)
        {
            UpdateValueString();
        }

        /// <summary>
        /// Gets or sets the header of the control.
        /// </summary>
        public object Header
        {
            get { return (object)GetValue(HeaderProperty); }
            set { SetValue(HeaderProperty, value); }
        }

        /// <summary>
        /// Identifies the Header DependencyProperty.
        /// </summary>
        public static readonly DependencyProperty HeaderProperty = DependencyProperty.Register(
            "Header", typeof(object), typeof(DateTimePickerBase), null);

        /// <summary>
        /// Gets or sets the template used to display the control's header.
        /// </summary>
        public DataTemplate HeaderTemplate
        {
            get { return (DataTemplate)GetValue(HeaderTemplateProperty); }
            set { SetValue(HeaderTemplateProperty, value); }
        }

        /// <summary>
        /// Identifies the HeaderTemplate DependencyProperty.
        /// </summary>
        public static readonly DependencyProperty HeaderTemplateProperty = DependencyProperty.Register(
            "HeaderTemplate", typeof(DataTemplate), typeof(DateTimePickerBase), null);

        /// <summary>
        /// Gets or sets the Uri to use for loading the IDateTimePickerPage instance when the control is clicked.
        /// </summary>
        public Uri PickerPageUri
        {
            get { return (Uri)GetValue(PickerPageUriProperty); }
            set { SetValue(PickerPageUriProperty, value); }
        }

        /// <summary>
        /// Identifies the PickerPageUri DependencyProperty.
        /// </summary>
        public static readonly DependencyProperty PickerPageUriProperty = DependencyProperty.Register(
            "PickerPageUri", typeof(Uri), typeof(DateTimePickerBase), null);

        /// <summary>
        /// Gets the fallback value for the ValueStringFormat property.
        /// </summary>
        protected virtual string ValueStringFormatFallback { get { return "{0}"; } }

        /// <summary>
        /// Initializes a new instance of the DateTimePickerBase control.
        /// </summary>
        public DateTimePickerBase()
        {
        }

        /// <summary>
        /// Called when the control's Template is expanded.
        /// </summary>
        public override void OnApplyTemplate()
        {
            // Unhook from old template
            if (null != _dateButtonPart)
            {
                _dateButtonPart.Click -= OnDateButtonClick;
            }

            base.OnApplyTemplate();

            // Hook up to new template
            _dateButtonPart = GetTemplateChild(ButtonPartName) as ButtonBase;
            if (null != _dateButtonPart)
            {
                _dateButtonPart.Click += OnDateButtonClick;
            }
        }

        /// <summary>
        /// Date should flow from right to left for arabic and persian.
        /// </summary>
        internal static bool DateShouldFlowRTL()
        {
            string lang = CultureInfo.CurrentCulture.TwoLetterISOLanguageName;
            return lang == "ar" || lang == "fa";
        }

        /// <summary>
        /// Returns true if the current language is RTL.
        /// </summary>
        internal static bool IsRTLLanguage()
        {
            // Currently supported RTL languages are arabic, hebrew and persian.
            string lang = CultureInfo.CurrentCulture.TwoLetterISOLanguageName;
            return lang == "ar" || lang == "he" || lang == "fa";
        }

        private void OnDateButtonClick(object sender, RoutedEventArgs e)
        {
            OpenPickerPage();
        }

        private void UpdateValueString()
        {
            ValueString = string.Format(CultureInfo.CurrentCulture, ValueStringFormat ?? ValueStringFormatFallback, Value);
        }

        private void OpenPickerPage()
        {
            if (null == PickerPageUri)
            {
                throw new ArgumentException("PickerPageUri property must not be null.");
            }

            if (null == _frame)
            {
                // Hook up to necessary events and navigate
                _frame = Application.Current.RootVisual as PhoneApplicationFrame;
                if (null != _frame)
                {
                    _frameContentWhenOpened = _frame.Content;

                    // Save and clear host page transitions for the upcoming "popup" navigation
                    UIElement frameContentWhenOpenedAsUIElement = _frameContentWhenOpened as UIElement;
                    if (null != frameContentWhenOpenedAsUIElement)
                    {
                        _savedNavigationInTransition = TransitionService.GetNavigationInTransition(frameContentWhenOpenedAsUIElement);
                        TransitionService.SetNavigationInTransition(frameContentWhenOpenedAsUIElement, null);
                        _savedNavigationOutTransition = TransitionService.GetNavigationOutTransition(frameContentWhenOpenedAsUIElement);
                        TransitionService.SetNavigationOutTransition(frameContentWhenOpenedAsUIElement, null);
                    }

                    _frame.Navigated += OnFrameNavigated;
                    _frame.NavigationStopped += OnFrameNavigationStoppedOrFailed;
                    _frame.NavigationFailed += OnFrameNavigationStoppedOrFailed;

                    _frame.Navigate(PickerPageUri);
                }
            }

        }

        private void ClosePickerPage()
        {
            // Unhook from events
            if (null != _frame)
            {
                _frame.Navigated -= OnFrameNavigated;
                _frame.NavigationStopped -= OnFrameNavigationStoppedOrFailed;
                _frame.NavigationFailed -= OnFrameNavigationStoppedOrFailed;

                // Restore host page transitions for the completed "popup" navigation
                UIElement frameContentWhenOpenedAsUIElement = _frameContentWhenOpened as UIElement;
                if (null != frameContentWhenOpenedAsUIElement)
                {
                    TransitionService.SetNavigationInTransition(frameContentWhenOpenedAsUIElement, _savedNavigationInTransition);
                    _savedNavigationInTransition = null;
                    TransitionService.SetNavigationOutTransition(frameContentWhenOpenedAsUIElement, _savedNavigationOutTransition);
                    _savedNavigationOutTransition = null;
                }

                _frame = null;
                _frameContentWhenOpened = null;
            }
            // Commit the value if available
            if (null != _dateTimePickerPage)
            {
                if(_dateTimePickerPage.Value.HasValue)
                {
                    Value = _dateTimePickerPage.Value.Value;
                }
                _dateTimePickerPage = null;
            }
        }

        private void OnFrameNavigated(object sender, NavigationEventArgs e)
        {
            if (e.Content == _frameContentWhenOpened)
            {
                // Navigation to original page; close the picker page
                ClosePickerPage();
            }
            else if (null == _dateTimePickerPage)
            {
                // Navigation to a new page; capture it and push the value in
                var page = e.Content as DateTimePickerPageBase;
                
                if (null != page)
                {
                    _dateTimePickerPage = page;
                    _dateTimePickerPage.Value = Value.GetValueOrDefault(DateTime.Now);

                    page.SetFlowDirection(this.FlowDirection);
                }
            }
        }

        private void OnFrameNavigationStoppedOrFailed(object sender, EventArgs e)
        {
            // Abort
            ClosePickerPage();
        }
    }
}
