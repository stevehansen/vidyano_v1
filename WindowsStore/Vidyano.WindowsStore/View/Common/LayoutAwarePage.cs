using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Input;
using Vidyano.Commands;
using Windows.System;
using Windows.UI.Core;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;

namespace Vidyano.View.Common
{
    public class LayoutAwarePage: Page
    {
        private List<Control> layoutAwareControls;
        private Frame frame;

        protected LayoutAwarePage()
        {
            this.Loaded += (sender, e) =>
            {
                Service.Current.PropertyChanged += ServicePropertyChanged;

                frame = (Frame)Window.Current.Content;
                StartLayoutUpdates(sender, e);

                if (ActualHeight == Window.Current.Bounds.Height && ActualWidth == Window.Current.Bounds.Width)
                {
                    Window.Current.CoreWindow.Dispatcher.AcceleratorKeyActivated += CoreDispatcher_AcceleratorKeyActivated;
                    Window.Current.CoreWindow.PointerPressed += CoreWindow_PointerPressed;
                }
            };

            this.Unloaded += (sender, e) =>
            {
                Service.Current.PropertyChanged -= ServicePropertyChanged;

                StopLayoutUpdates(sender, e);

                Window.Current.CoreWindow.Dispatcher.AcceleratorKeyActivated -= CoreDispatcher_AcceleratorKeyActivated;
                Window.Current.CoreWindow.PointerPressed -= CoreWindow_PointerPressed;
            };

            GoBack = new GoBack();
            Navigate = new Navigate();
        }

        public ICommand GoBack { get; private set; }

        public ICommand Navigate { get; private set; }

        #region Service Events

        private void ServicePropertyChanged(object sender, System.ComponentModel.PropertyChangedEventArgs e)
        {
            if (e.PropertyName == "IsBusy")
                BusyChanged();
        }

        private void BusyChanged()
        {
            VisualStateManager.GoToState(this, Service.Current.IsBusy ? "Busy" : "NotBusy", true);
        }

        #endregion

        #region Navigation support

        /// <summary>
        /// Invoked as an event handler to navigate backward in the page's associated
        /// <see cref="Frame"/> until it reaches the top of the navigation stack.
        /// </summary>
        /// <param name="sender">Instance that triggered the event.</param>
        /// <param name="e">Event data describing the conditions that led to the event.</param>
        private void GoHome(object sender, RoutedEventArgs e)
        {
            // Use the navigation frame to return to the topmost page
            while (frame.CanGoBack)
                frame.GoBack();
        }

        /// <summary>
        /// Invoked as an event handler to navigate forward in the navigation stack
        /// associated with this page's <see cref="Frame"/>.
        /// </summary>
        /// <param name="sender">Instance that triggered the event.</param>
        /// <param name="e">Event data describing the conditions that led to the event.</param>
        private void GoForward(object sender, RoutedEventArgs e)
        {
            // Use the navigation frame to move to the next page
            if (frame.CanGoForward)
                frame.GoForward();
        }

        /// <summary>
        /// Invoked on every keystroke, including system keys such as Alt key combinations, when
        /// this page is active and occupies the entire window.  Used to detect keyboard navigation
        /// between pages even when the page itself doesn't have focus.
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
                bool menuKey = (coreWindow.GetKeyState(VirtualKey.Menu) & downState) == downState;
                bool controlKey = (coreWindow.GetKeyState(VirtualKey.Control) & downState) == downState;
                bool shiftKey = (coreWindow.GetKeyState(VirtualKey.Shift) & downState) == downState;
                bool noModifiers = !menuKey && !controlKey && !shiftKey;
                bool onlyAlt = menuKey && !controlKey && !shiftKey;

                if (((int)virtualKey == 166 && noModifiers) || (virtualKey == VirtualKey.Left && onlyAlt))
                {
                    // When the previous key or Alt+Left are pressed navigate back
                    args.Handled = true;
                    if (GoBack.CanExecute(null))
                        GoBack.Execute(null);
                }
                else if (((int)virtualKey == 167 && noModifiers) || (virtualKey == VirtualKey.Right && onlyAlt))
                {
                    // When the next key or Alt+Right are pressed navigate forward
                    args.Handled = true;
                    this.GoForward(this, new RoutedEventArgs());
                }
            }
        }

        /// <summary>
        /// Invoked on every mouse click, touch screen tap, or equivalent interaction when this
        /// page is active and occupies the entire window.  Used to detect browser-style next and
        /// previous mouse button clicks to navigate between pages.
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
            bool backPressed = properties.IsXButton1Pressed;
            bool forwardPressed = properties.IsXButton2Pressed;
            if (backPressed ^ forwardPressed)
            {
                args.Handled = true;
                if (backPressed && GoBack.CanExecute(null))
                    GoBack.Execute(null);
                
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
            if (this.layoutAwareControls == null)
            {
                // Start listening to view state changes when there are controls interested in updates
                SizeChanged += this.OnSizeChanged;
                this.layoutAwareControls = new List<Control>();
            }
            this.layoutAwareControls.Add(control);

            // Set the initial visual state of the control
            VisualStateManager.GoToState(control, DetermineVisualState(ApplicationView.Value), false);
        }

        private void OnSizeChanged(object sender, SizeChangedEventArgs e)
        {
            this.InvalidateVisualState();
        }

        public void StopLayoutUpdates(object sender, RoutedEventArgs e)
        {
            var control = sender as Control;
            if (control == null || this.layoutAwareControls == null) return;
            this.layoutAwareControls.Remove(control);
            if (this.layoutAwareControls.Count == 0)
            {
                // Stop listening to view state changes when no controls are interested in updates
                this.layoutAwareControls = null;
                SizeChanged -= this.OnSizeChanged;
            }
        }

        private string DetermineVisualState(ApplicationViewState viewState)
        {
            return viewState.ToString();
        }

        public void InvalidateVisualState()
        {
            if (this.layoutAwareControls != null)
            {
                string visualState = DetermineVisualState(ApplicationView.Value);
                foreach (var layoutAwareControl in this.layoutAwareControls)
                {
                    VisualStateManager.GoToState(layoutAwareControl, visualState, false);
                }
            }
        }

        #endregion
    }
}