﻿// (c) Copyright Microsoft Corporation.
// This source is subject to the Microsoft Public License (Ms-PL).
// Please see http://go.microsoft.com/fwlink/?LinkID=131993 for details.
// All other rights reserved.

using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Navigation;
using Microsoft.Phone.Shell;

namespace Microsoft.Phone.Controls.Primitives
{
    /// <summary>
    /// Represents a base class for pages that work with DateTimePickerBase to allow users to choose a date/time.
    /// </summary>
    public abstract class DateTimePickerPageBase : PhoneApplicationPage, IDateTimePickerPage
    {
        private const string VisibilityGroupName = "VisibilityStates";
        private const string OpenVisibilityStateName = "Open";
        private const string ClosedVisibilityStateName = "Closed";
        private const string StateKey_Value = "DateTimePickerPageBase_State_Value";

        private LoopingSelector _primarySelectorPart;
        private LoopingSelector _secondarySelectorPart;
        private LoopingSelector _tertiarySelectorPart;
        private Storyboard _closedStoryboard;

        /// <summary>
        /// Initializes the DateTimePickerPageBase class; must be called from the subclass's constructor.
        /// </summary>
        /// <param name="primarySelector">Primary selector.</param>
        /// <param name="secondarySelector">Secondary selector.</param>
        /// <param name="tertiarySelector">Tertiary selector.</param>
        protected void InitializeDateTimePickerPage(LoopingSelector primarySelector, LoopingSelector secondarySelector, LoopingSelector tertiarySelector)
        {
            if (null == primarySelector)
            {
                throw new ArgumentNullException("primarySelector");
            }
            if (null == secondarySelector)
            {
                throw new ArgumentNullException("secondarySelector");
            }
            if (null == tertiarySelector)
            {
                throw new ArgumentNullException("tertiarySelector");
            }

            _primarySelectorPart = primarySelector;
            _secondarySelectorPart = secondarySelector;
            _tertiarySelectorPart = tertiarySelector;

            // Hook up to interesting events
            _primarySelectorPart.DataSource.SelectionChanged += OnDataSourceSelectionChanged;
            _secondarySelectorPart.DataSource.SelectionChanged += OnDataSourceSelectionChanged;
            _tertiarySelectorPart.DataSource.SelectionChanged += OnDataSourceSelectionChanged;
            _primarySelectorPart.IsExpandedChanged += OnSelectorIsExpandedChanged;
            _secondarySelectorPart.IsExpandedChanged += OnSelectorIsExpandedChanged;
            _tertiarySelectorPart.IsExpandedChanged += OnSelectorIsExpandedChanged;

            // Hide all selectors
            _primarySelectorPart.Visibility = Visibility.Collapsed;
            _secondarySelectorPart.Visibility = Visibility.Collapsed;
            _tertiarySelectorPart.Visibility = Visibility.Collapsed;

            // Position and reveal the culture-relevant selectors
            int column = 0;
            foreach (LoopingSelector selector in GetSelectorsOrderedByCulturePattern())
            {
                Grid.SetColumn(selector, column);
                selector.Visibility = Visibility.Visible;
                column++;
            }

            // Hook up to storyboard(s)
            FrameworkElement templateRoot = VisualTreeHelper.GetChild(this, 0) as FrameworkElement;
            if (null != templateRoot)
            {
                foreach (VisualStateGroup group in VisualStateManager.GetVisualStateGroups(templateRoot))
                {
                    if (VisibilityGroupName == group.Name)
                    {
                        foreach (VisualState state in group.States)
                        {
                            if ((ClosedVisibilityStateName == state.Name) && (null != state.Storyboard))
                            {
                                _closedStoryboard = state.Storyboard;
                                _closedStoryboard.Completed += OnClosedStoryboardCompleted;
                            }
                        }
                    }
                }
            }

            // Customize the ApplicationBar Buttons by providing the right text
            if (null != ApplicationBar)
            {
                foreach (object obj in ApplicationBar.Buttons)
                {
                    IApplicationBarIconButton button = obj as IApplicationBarIconButton;
                    if (null != button)
                    {
                        if ("DONE" == button.Text)
                        {
                            button.Text = LocalizedResources.ControlResources.DateTimePickerDoneText;
                            button.Click += OnDoneButtonClick;
                        }
                        else if ("CANCEL" == button.Text)
                        {
                            button.Text = LocalizedResources.ControlResources.DateTimePickerCancelText;
                            button.Click += OnCancelButtonClick;
                        }
                    }
                }
            }

            // Play the Open state
            VisualStateManager.GoToState(this, OpenVisibilityStateName, true);
        }

        private void OnDataSourceSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Push the selected item to all selectors
            DataSource dataSource = (DataSource)sender;
            _primarySelectorPart.DataSource.SelectedItem = dataSource.SelectedItem;
            _secondarySelectorPart.DataSource.SelectedItem = dataSource.SelectedItem;
            _tertiarySelectorPart.DataSource.SelectedItem = dataSource.SelectedItem;
        }

        private void OnSelectorIsExpandedChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            if ((bool)e.NewValue)
            {
                // Ensure that only one selector is expanded at a time
                _primarySelectorPart.IsExpanded = (sender == _primarySelectorPart);
                _secondarySelectorPart.IsExpanded = (sender == _secondarySelectorPart);
                _tertiarySelectorPart.IsExpanded = (sender == _tertiarySelectorPart);
            }
        }

        private void OnDoneButtonClick(object sender, EventArgs e)
        {
            // Commit the value and close
            Debug.Assert((_primarySelectorPart.DataSource.SelectedItem == _secondarySelectorPart.DataSource.SelectedItem) && (_secondarySelectorPart.DataSource.SelectedItem == _tertiarySelectorPart.DataSource.SelectedItem));
            _value = ((DateTimeWrapper)_primarySelectorPart.DataSource.SelectedItem).DateTime;
            ClosePickerPage();
        }

        private void OnCancelButtonClick(object sender, EventArgs e)
        {
            // Close without committing a value
            _value = null;
            ClosePickerPage();
        }

        /// <summary>
        /// Called when the Back key is pressed.
        /// </summary>
        /// <param name="e">Event arguments.</param>
        protected override void OnBackKeyPress(CancelEventArgs e)
        {
            if (null == e)
            {
                throw new ArgumentNullException("e");
            }

            // Cancel back action so we can play the Close state animation (then go back)
            e.Cancel = true;
            ClosePickerPage();
        }

        private void ClosePickerPage()
        {
            // Play the Close state (if available)
            if (null != _closedStoryboard)
            {
                VisualStateManager.GoToState(this, ClosedVisibilityStateName, true);
            }
            else
            {
                OnClosedStoryboardCompleted(null, null);
            }
        }

        private void OnClosedStoryboardCompleted(object sender, EventArgs e)
        {
            // Close the picker page
            NavigationService.GoBack();
        }

        /// <summary>
        /// Gets a sequence of LoopingSelector parts ordered according to culture string for date/time formatting.
        /// </summary>
        /// <returns>LoopingSelectors ordered by culture-specific priority.</returns>
        protected abstract IEnumerable<LoopingSelector> GetSelectorsOrderedByCulturePattern();

        /// <summary>
        /// Gets a sequence of LoopingSelector parts ordered according to culture string for date/time formatting.
        /// </summary>
        /// <param name="pattern">Culture-specific date/time format string.</param>
        /// <param name="patternCharacters">Date/time format string characters for the primary/secondary/tertiary LoopingSelectors.</param>
        /// <param name="selectors">Instances for the primary/secondary/tertiary LoopingSelectors.</param>
        /// <returns>LoopingSelectors ordered by culture-specific priority.</returns>
        protected static IEnumerable<LoopingSelector> GetSelectorsOrderedByCulturePattern(string pattern, char[] patternCharacters, LoopingSelector[] selectors)
        {
            if (null == pattern)
            {
                throw new ArgumentNullException("pattern");
            }
            if (null == patternCharacters)
            {
                throw new ArgumentNullException("patternCharacters");
            }
            if (null == selectors)
            {
                throw new ArgumentNullException("selectors");
            }
            if (patternCharacters.Length != selectors.Length)
            {
                throw new ArgumentException("Arrays must contain the same number of elements.");
            }

            // Create a list of index and selector pairs
            List<Tuple<int, LoopingSelector>> pairs = new List<Tuple<int, LoopingSelector>>(patternCharacters.Length);
            for (int i = 0; i < patternCharacters.Length; i++)
            {
                pairs.Add(new Tuple<int, LoopingSelector>(pattern.IndexOf(patternCharacters[i]), selectors[i]));
            }

            // Return the corresponding selectors in order
            return pairs.Where(p => -1 != p.Item1).OrderBy(p => p.Item1).Select(p => p.Item2).Where(s => null != s);
        }

        /// <summary>
        /// Gets or sets the DateTime to show in the picker page and to set when the user makes a selection.
        /// </summary>
        public DateTime? Value
        {
            get { return _value; }
            set
            {
                _value = value;
                DateTimeWrapper wrapper = new DateTimeWrapper(_value.GetValueOrDefault(DateTime.Now));
                _primarySelectorPart.DataSource.SelectedItem = wrapper;
                _secondarySelectorPart.DataSource.SelectedItem = wrapper;
                _tertiarySelectorPart.DataSource.SelectedItem = wrapper;
            }
        }
        private DateTime? _value;

        /// <summary>
        /// Called when a page is no longer the active page in a frame.
        /// </summary>
        /// <param name="e">An object that contains the event data.</param>
        protected override void OnNavigatedFrom(NavigationEventArgs e)
        {
            if (null == e)
            {
                throw new ArgumentNullException("e");
            }

            base.OnNavigatedFrom(e);

            // Save Value if navigating away from application
            if ("app://external/" == e.Uri.ToString())
            {
                State[StateKey_Value] = Value;
            }
        }

        /// <summary>
        /// Called when a page becomes the active page in a frame.
        /// </summary>
        /// <param name="e">An object that contains the event data.</param>
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
            if (null == e)
            {
                throw new ArgumentNullException("e");
            }

            base.OnNavigatedTo(e);

            // Restore Value if returning to application (to avoid inconsistent state)
            if (State.ContainsKey(StateKey_Value))
            {
                Value = State[StateKey_Value] as DateTime?;

                // Back out from picker page for consistency with behavior of core pickers in this scenario
                if (NavigationService.CanGoBack)
                {
                    NavigationService.GoBack();
                }
            }
        }

        /// <summary>
        /// Sets the selectors and title flow direction.
        /// </summary>
        /// <param name="flowDirection">Flow direction to set.</param>
        internal abstract void SetFlowDirection(FlowDirection flowDirection);
    }
}
