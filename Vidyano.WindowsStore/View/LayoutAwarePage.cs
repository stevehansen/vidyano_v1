using System.Collections.Generic;
using Windows.System;
using Windows.UI.Core;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View
{
    public class LayoutAwarePage : Page
    {
        private Frame frame;
        private List<Control> layoutAwareControls;

        protected LayoutAwarePage()
        {
            Loaded += (sender, e) =>
            {
                frame = (Frame)Window.Current.Content;
                StartLayoutUpdates(sender, e);

                if (ActualHeight == Window.Current.Bounds.Height && ActualWidth == Window.Current.Bounds.Width)
                {
                    Window.Current.CoreWindow.Dispatcher.AcceleratorKeyActivated += CoreDispatcher_AcceleratorKeyActivated;
                    Window.Current.CoreWindow.PointerPressed += CoreWindow_PointerPressed;
                }
            };

            Unloaded += (sender, e) =>
            {
                StopLayoutUpdates(sender, e);

                Window.Current.CoreWindow.Dispatcher.AcceleratorKeyActivated -= CoreDispatcher_AcceleratorKeyActivated;
                Window.Current.CoreWindow.PointerPressed -= CoreWindow_PointerPressed;
            };
        }

        #region Navigation support

        private void GoForward(object sender, RoutedEventArgs e)
        {
            // Use the navigation frame to move to the next page
            if (frame.CanGoForward)
                frame.GoForward();
        }

        private void GoBack(object sender, RoutedEventArgs e)
        {
            // Use the navigation frame to move to the previous page
            if (frame.CanGoBack)
                frame.GoBack();
        }

        /// <summary>
        ///     Invoked on every keystroke, including system keys such as Alt key combinations, when
        ///     this page is active and occupies the entire window.  Used to detect keyboard navigation
        ///     between pages even when the page itself doesn't have focus.
        /// </summary>
        /// <param name="sender">Instance that triggered the event.</param>
        /// <param name="args">Event data describing the conditions that led to the event.</param>
        private void CoreDispatcher_AcceleratorKeyActivated(CoreDispatcher sender, AcceleratorKeyEventArgs args)
        {
            var virtualKey = args.VirtualKey;

            // Only investigate further when Left, Right, or the dedicated Previous or Next keys are pressed
            if ((args.EventType == CoreAcceleratorKeyEventType.SystemKeyDown || args.EventType == CoreAcceleratorKeyEventType.KeyDown) &&
                (virtualKey == VirtualKey.Left || virtualKey == VirtualKey.Right || (int)virtualKey == 166 || (int)virtualKey == 167))
            {
                var coreWindow = Window.Current.CoreWindow;
                var downState = CoreVirtualKeyStates.Down;
                var menuKey = (coreWindow.GetKeyState(VirtualKey.Menu) & downState) == downState;
                var controlKey = (coreWindow.GetKeyState(VirtualKey.Control) & downState) == downState;
                var shiftKey = (coreWindow.GetKeyState(VirtualKey.Shift) & downState) == downState;
                var noModifiers = !menuKey && !controlKey && !shiftKey;
                var onlyAlt = menuKey && !controlKey && !shiftKey;

                if (((int)virtualKey == 166 && noModifiers) || (virtualKey == VirtualKey.Left && onlyAlt))
                {
                    // When the previous key or Alt+Left are pressed navigate back
                    args.Handled = true;
                    GoBack(this, new RoutedEventArgs());
                }
                else if (((int)virtualKey == 167 && noModifiers) || (virtualKey == VirtualKey.Right && onlyAlt))
                {
                    // When the next key or Alt+Right are pressed navigate forward
                    args.Handled = true;
                    GoForward(this, new RoutedEventArgs());
                }
            }
        }

        /// <summary>
        ///     Invoked on every mouse click, touch screen tap, or equivalent interaction when this
        ///     page is active and occupies the entire window.  Used to detect browser-style next and
        ///     previous mouse button clicks to navigate between pages.
        /// </summary>
        /// <param name="sender">Instance that triggered the event.</param>
        /// <param name="args">Event data describing the conditions that led to the event.</param>
        private void CoreWindow_PointerPressed(CoreWindow sender,
                                               PointerEventArgs args)
        {
            var properties = args.CurrentPoint.Properties;

            // Ignore button chords with the left, right, and middle buttons
            if (properties.IsLeftButtonPressed || properties.IsRightButtonPressed || properties.IsMiddleButtonPressed) return;

            // If back or foward are pressed (but not both) navigate appropriately
            var backPressed = properties.IsXButton1Pressed;
            var forwardPressed = properties.IsXButton2Pressed;
            if (backPressed ^ forwardPressed)
            {
                args.Handled = true;
                if (backPressed)
                    GoBack(this, new RoutedEventArgs());

                if (forwardPressed)
                    GoForward(this, new RoutedEventArgs());
            }
        }

        #endregion

        #region Visual state switching

        public void StartLayoutUpdates(object sender, RoutedEventArgs e)
        {
            var control = sender as Control;
            if (control == null) return;
            if (layoutAwareControls == null)
            {
                // Start listening to view state changes when there are controls interested in updates
                SizeChanged += OnSizeChanged;
                layoutAwareControls = new List<Control>();
            }
            layoutAwareControls.Add(control);

            // Set the initial visual state of the control
            VisualStateManager.GoToState(control, DetermineVisualState(ApplicationView.Value), false);
        }

        private void OnSizeChanged(object sender, SizeChangedEventArgs e)
        {
            InvalidateVisualState();
        }

        public void StopLayoutUpdates(object sender, RoutedEventArgs e)
        {
            var control = sender as Control;
            if (control == null || layoutAwareControls == null) return;
            layoutAwareControls.Remove(control);
            if (layoutAwareControls.Count == 0)
            {
                // Stop listening to view state changes when no controls are interested in updates
                layoutAwareControls = null;
                SizeChanged -= OnSizeChanged;
            }
        }

        private string DetermineVisualState(ApplicationViewState viewState)
        {
            return viewState.ToString();
        }

        public void InvalidateVisualState()
        {
            if (layoutAwareControls != null)
            {
                var visualState = DetermineVisualState(ApplicationView.Value);
                foreach (var layoutAwareControl in layoutAwareControls)
                    VisualStateManager.GoToState(layoutAwareControl, visualState, false);
            }
        }

        #endregion
    }
}